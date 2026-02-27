import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ethers } from 'ethers';
import { chainInfo } from '@gluwa/cc-next-query-builder/';
import CreditScoreUSC from '../blockchain/abi/CreditScoreUSC.json';

@Injectable()
export class ProofService {

    private readonly creditcoinRpc = 'https://rpc.usc-testnet2.creditcoin.network';
    private readonly uscAddress = '0x0627D559F023393288AF736407eBfd177FD36513';

    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private usc: ethers.Contract;

    private jobs: Map<string, { status: string; txHash?: string; error?: string }> = new Map();

    constructor() {
        this.provider = new ethers.JsonRpcProvider(this.creditcoinRpc);
        this.provider.on('debug', (info: any) => console.dir(info, { depth: 10 }));
        this.provider.getNetwork().then(network => console.dir(network, { depth: 10 }));

        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
        this.usc = new ethers.Contract(this.uscAddress, CreditScoreUSC.abi, this.wallet);
    }

    private async checkContractState(chainKey: number): Promise<void> {
        const aggregatorAddr: string = await this.usc.aggregator();
        if (aggregatorAddr === ethers.ZeroAddress) {
            throw new InternalServerErrorException(
                `Aggregator not set on CreditScoreUSC. Call setAggregator() as admin first.`
            );
        }

        const authorizedSource: string = await this.usc.authorizedSourceContracts(chainKey);
        if (authorizedSource === ethers.ZeroAddress) {
            throw new InternalServerErrorException(
                `No authorized source contract for chainKey ${chainKey}. Call registerSourceContract() as admin first.`
            );
        }

        console.log(`[PreFlight] Aggregator: ${aggregatorAddr}`);
        console.log(`[PreFlight] Authorized source (chainKey ${chainKey}): ${authorizedSource}`);
    }

    private calculateTransactionIndex(siblings: { hash: string; isLeft: boolean }[]): number {
        let index = 0;
        for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].isLeft) index |= 1 << i;
        }
        return index;
    }

    getJobStatus(jobId: string) {
        return this.jobs.get(jobId) ?? { status: 'not_found' };
    }

    private async _processInBackground(jobId: string, txHash: string): Promise<void> {
        const chainKey = 1;

        try {
            this.jobs.set(jobId, { status: 'checking_contract' });
            console.log('[Step 1] Running pre-flight contract state checks...');
            await this.checkContractState(chainKey);

            this.jobs.set(jobId, { status: 'fetching_tx' });
            console.log('[Step 2] Fetching transaction from Sepolia...');
            const sourceProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
            const tx = await sourceProvider.getTransaction(txHash);

            if (!tx || !tx.blockNumber) {
                throw new BadRequestException(`Transaction ${txHash} not found or not yet mined.`);
            }

            const blockNumber = tx.blockNumber;
            console.log(`[Step 2] Transaction found in block ${blockNumber}`);

            this.jobs.set(jobId, { status: 'waiting_attestation' });
            console.log('[Step 3] Waiting for block attestation on USC...');
            const info = new chainInfo.PrecompileChainInfoProvider(this.provider);
            console.log(`[Step 3] Waiting for Sepolia block ${blockNumber} to be attested...`);

            await info.waitUntilHeightAttested(chainKey, blockNumber, 10000, 1800000);
            console.log('[Step 3] Block attested.');

            this.jobs.set(jobId, { status: 'generating_proof' });
            console.log('[Step 4] Generating proof...');
            const ProverAPIProofGenerator =
                require('@gluwa/cc-next-query-builder').proofGenerator.api.ProverAPIProofGenerator;

            const proofGen = new ProverAPIProofGenerator(
                chainKey,
                'https://proof-gen-api.usc-testnet2.creditcoin.network',
            );

            const proofResult = await proofGen.generateProof(txHash);

            if (!proofResult.success) {
                throw new InternalServerErrorException(`Proof generation failed: ${proofResult.error}`);
            }

            const proofData = proofResult.data;
            console.log(`[Step 4] Proof generated. ChainKey: ${proofData.chainKey}`);

            const formattedSiblings = proofData.merkleProof.siblings.map(
                (s: { hash: string; isLeft: boolean }) => [s.hash, s.isLeft]
            );

            const txBytes = typeof proofData.txBytes === 'string'
                ? proofData.txBytes
                : ethers.hexlify(proofData.txBytes);

            console.log('[Step 6] Checking if query already processed...');
            const txIndex = this.calculateTransactionIndex(proofData.merkleProof.siblings);
            const txKey = ethers.keccak256(
                ethers.solidityPacked(
                    ['uint64', 'uint64', 'uint256'],
                    [proofData.chainKey, proofData.headerNumber, txIndex]
                )
            );
            const alreadyProcessed: boolean = await this.usc.processedQueries(txKey);
            if (alreadyProcessed) {
                throw new BadRequestException(`Query already processed (txKey: ${txKey})`);
            }

            this.jobs.set(jobId, { status: 'submitting' });
            console.log('[Step 8] Submitting proof to USC...');
            const txResponse = await this.usc.submitScoreFromQuery(
                proofData.chainKey,
                proofData.headerNumber,
                txBytes,
                proofData.merkleProof.root,
                formattedSiblings,
                proofData.continuityProof.lowerEndpointDigest,
                proofData.continuityProof.roots,
                { gasLimit: 5_000_000 },
            );

            console.log(`[Step 8] Transaction sent: ${txResponse.hash}`);
            const receipt = await txResponse.wait();

            if (receipt.status === 0) {
                throw new InternalServerErrorException(`Transaction reverted: ${txResponse.hash}`);
            }

            console.log(`[Step 8] Proof successfully submitted: ${txResponse.hash}`);
            this.jobs.set(jobId, { status: 'success', txHash: txResponse.hash });

        } catch (err: any) {
            const message = err?.shortMessage || err?.message || 'Unknown error';
            console.error('[ProofService] Error:', message);
            this.jobs.set(jobId, { status: 'failed', error: message });
        }
    }

    async processTransaction(txHash: string): Promise<{ jobId: string; message: string }> {
        const jobId = `job_${txHash.slice(0, 10)}_${Date.now()}`;
        this.jobs.set(jobId, { status: 'queued' });
        this._processInBackground(jobId, txHash).catch(() => { });
        return {
            jobId,
            message: 'Proof processing started. Poll /proof/status/:jobId for updates.',
        };
    }
}