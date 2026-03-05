import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ethers } from 'ethers';
import { chainInfo } from '@gluwa/cc-next-query-builder/';
import CreditScoreUSC from '../blockchain/abi/CreditScoreUSC.json';

@Injectable()
export class ProofService {

    private readonly creditcoinRpc = 'https://rpc.usc-testnet2.creditcoin.network';
    private readonly uscAddress = '0x620431B91db7a499eeC0eC9a4c817dA3B5A90861';

    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private usc: ethers.Contract;


    private jobs: Map<string, {
        status: string; txHash?: string; error?: string; currentAttestedBlock?: number; targetBlock?: number; blocksRemaining?: number; estimatedWaitSeconds?: number;
    }> = new Map();
    private addressToJobId: Map<string, string> = new Map();
    private processedTxHashes = new Set<string>();

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
            if (this.processedTxHashes.has(txHash.toLowerCase())) {
                throw new BadRequestException(`Transaction ${txHash} already processed (cached)`);
            }

            this.jobs.set(jobId, { status: 'waiting_attestation' });
            console.log('[Step 3] Waiting for block attestation on USC...');
            console.log(`[Step 3] Waiting for Sepolia block ${blockNumber} to be attested...`);
            const POLL_INTERVAL = 10_000;
            const MAX_WAIT = 1_800_000; // 30 minutes
            const started = Date.now();

            while (true) {
                if (Date.now() - started > MAX_WAIT) {
                    throw new InternalServerErrorException('Attestation timeout after 30 minutes');
                }

                const chainInfoResult = await this.provider.call({
                    to: '0x0000000000000000000000000000000000000fd3',
                    data: ethers.concat([
                        '0x809112da',
                        ethers.AbiCoder.defaultAbiCoder().encode(['uint64'], [chainKey])
                    ])
                });

                // Parse attested block number from precompile response (first 32 bytes = block number)
                const currentAttestedBlock = Number(
                    ethers.toBigInt('0x' + chainInfoResult.slice(2, 66))
                );

                const blocksRemaining = Math.max(0, blockNumber - currentAttestedBlock);
                const estimatedWaitSeconds = blocksRemaining * 12; // ~12s per Sepolia block

                this.jobs.set(jobId, {
                    status: 'waiting_attestation',
                    currentAttestedBlock,
                    targetBlock: blockNumber,
                    blocksRemaining,
                    estimatedWaitSeconds,
                });

                console.log(`[Step 3] Attested: ${currentAttestedBlock}, Target: ${blockNumber}, Remaining: ${blocksRemaining} blocks`);

                if (currentAttestedBlock >= blockNumber) {
                    console.log('[Step 3] Block attested.');
                    break;
                }

                await new Promise(r => setTimeout(r, POLL_INTERVAL));
            }

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
                this.processedTxHashes.add(txHash.toLowerCase());
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
                {
                    gasLimit: 5_000_000,
                    type: 0,
                    gasPrice: ethers.parseUnits('1', 'gwei')
                },
            );

            console.log(`[Step 8] Transaction sent: ${txResponse.hash}`);
            const receipt = await txResponse.wait();

            if (receipt.status === 0) {
                throw new InternalServerErrorException(`Transaction reverted: ${txResponse.hash}`);
            }

            console.log(`[Step 8] Proof successfully submitted: ${txResponse.hash}`);
            this.processedTxHashes.add(txHash.toLowerCase());
            this.jobs.set(jobId, { status: 'success', txHash: txResponse.hash });

        } catch (err: any) {
            const message = err?.shortMessage || err?.message || 'Unknown error';
            console.error('[ProofService] Error:', message);
            this.jobs.set(jobId, { status: 'failed', error: message });
        }
    }

    async processTransaction(
        txHash: string,
        userAddress?: string
    ): Promise<{ jobId: string; message: string }> {
        const jobId = `job_${txHash.slice(0, 10)}_${Date.now()}`;
        this.jobs.set(jobId, { status: 'queued' });

        if (userAddress) {
            this.addressToJobId.set(userAddress.toLowerCase(), jobId);
            console.log(`[ProofService] Address mapped: ${userAddress.toLowerCase()} → ${jobId}`);
        }

        this._processInBackground(jobId, txHash).catch(() => { });
        return {
            jobId,
            message: 'Proof processing started. Poll /proof/status/:jobId for updates.',
        };
    }

    getJobIdByAddress(address: string): string | null {
        const jobId = this.addressToJobId.get(address.toLowerCase()) ?? null
        console.log(`[ProofService] Address lookup: ${address.toLowerCase()} → ${jobId}`);
        return jobId;
    }
}