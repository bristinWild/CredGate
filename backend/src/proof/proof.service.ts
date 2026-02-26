import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ethers } from 'ethers';
import { chainInfo } from '@gluwa/cc-next-query-builder/';
import CreditScoreUSC from '../blockchain/abi/CreditScoreUSC.json';

@Injectable()
export class ProofService {

    private readonly creditcoinRpc = 'https://rpc.usc-testnet2.creditcoin.network';
    private readonly uscAddress = '0x0627D559F023393288AF736407eBfd177FD36513';

    private provider = new ethers.JsonRpcProvider(this.creditcoinRpc);

    private wallet = new ethers.Wallet(
        process.env.PRIVATE_KEY!,
        this.provider,
    );

    private usc = new ethers.Contract(
        this.uscAddress,
        CreditScoreUSC.abi,
        this.wallet,
    );

    // ─── Pre-flight Checks ────────────────────────────────────────────────────

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

    // ─── Static Call Simulation ───────────────────────────────────────────────

    private async simulateSubmit(
        proofData: any,
        formattedSiblings: any[],
    ): Promise<void> {
        try {
            await this.usc.submitScoreFromQuery.estimateGas(
                proofData.chainKey,
                proofData.headerNumber,
                proofData.txBytes,
                proofData.merkleProof.root,
                formattedSiblings,
                proofData.continuityProof.lowerEndpointDigest,
                proofData.continuityProof.roots,
                { gasLimit: 5_000_000 },
            );
            console.log('[Simulate] estimateGas passed — transaction should succeed.');
        } catch (simErr: any) {
            const reason =
                simErr?.reason ||
                simErr?.revert?.args?.[0] ||
                simErr?.error?.message ||
                simErr?.message ||
                'Unknown revert reason';
            console.error('[Simulate] estimateGas reverted:', reason);
            throw new BadRequestException(`Contract simulation failed: ${reason}`);
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private calculateTransactionIndex(
        siblings: { hash: string; isLeft: boolean }[]
    ): number {
        let index = 0;
        for (let i = 0; i < siblings.length; i++) {
            if (siblings[i].isLeft) {
                index |= 1 << i;
            }
        }
        return index;
    }

    // ─── Main Flow ────────────────────────────────────────────────────────────

    async processTransaction(txHash: string): Promise<{ txHash: string }> {
        const chainKey = 1;

        try {
            // Step 1: Pre-flight checks
            console.log('[Step 1] Running pre-flight contract state checks...');
            await this.checkContractState(chainKey);

            // Step 2: Fetch source transaction from Sepolia
            console.log('[Step 2] Fetching transaction from Sepolia...');
            const sourceProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
            const tx = await sourceProvider.getTransaction(txHash);

            if (!tx || !tx.blockNumber) {
                throw new BadRequestException(
                    `Transaction ${txHash} not found or not yet mined on Sepolia.`
                );
            }

            const blockNumber = tx.blockNumber;
            console.log(`[Step 2] Transaction found in block ${blockNumber}`);

            // Step 3: Wait for USC attestation
            console.log('[Step 3] Waiting for block attestation on USC...');
            const info = new chainInfo.PrecompileChainInfoProvider(this.provider);

            await info.waitUntilHeightAttested(
                chainKey,
                blockNumber,
                10000,
                600000,
            );
            console.log('[Step 3] Block attested.');

            // Step 4: Generate proof
            console.log('[Step 4] Generating proof...');
            const ProverAPIProofGenerator =
                require('@gluwa/cc-next-query-builder').proofGenerator.api.ProverAPIProofGenerator;

            const proofGen = new ProverAPIProofGenerator(
                1,
                'https://proof-gen-api.usc-testnet2.creditcoin.network',
            );

            const proofResult = await proofGen.generateProof(txHash);

            if (!proofResult.success) {
                throw new InternalServerErrorException(
                    `Proof generation failed: ${proofResult.error}`
                );
            }

            const proofData = proofResult.data;
            console.log(`[Step 4] Proof generated. ChainKey from proof: ${proofData.chainKey}`);

            console.log('[Debug] proofData keys:', Object.keys(proofData));
            console.log('[Debug] txBytes length:', proofData.txBytes.length);
            console.log('[Debug] txBytes first 20 bytes:', proofData.txBytes.slice(0, 20));
            console.log('[Debug] headerNumber:', proofData.headerNumber);
            console.log('[Debug] merkleProof root:', proofData.merkleProof.root);
            console.log('[Debug] siblings count:', proofData.merkleProof.siblings.length);
            console.log('[Debug] txBytes type:', typeof proofData.txBytes);
            console.log('[Debug] txBytes constructor:', proofData.txBytes?.constructor?.name);
            console.log('[Debug] txBytes raw:', JSON.stringify(proofData.txBytes).slice(0, 200));

            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ['uint8', 'bytes[]'],
                proofData.txBytes
            );

            console.log('[Debug] txType from decode:', decoded[0].toString());
            console.log('[Debug] chunks count:', decoded[1].length);

            // Step 5: Format siblings
            const formattedSiblings = proofData.merkleProof.siblings.map(
                (s: { hash: string; isLeft: boolean }) => [s.hash, s.isLeft]
            );

            const txBytes = typeof proofData.txBytes === 'string'
                ? proofData.txBytes
                : ethers.hexlify(proofData.txBytes);

            console.log('[Debug] txBytes hex prefix:', txBytes.slice(0, 20));

            // Step 6: Check if already processed
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
                throw new BadRequestException(
                    `This query has already been processed on-chain (txKey: ${txKey})`
                );
            }

            // Step 7: Simulate via staticCall
            // console.log('[Step 7] Simulating transaction via staticCall...');
            // await this.simulateSubmit(proofData, formattedSiblings);

            // Step 8: Submit proof on-chain
            console.log('[Step 8] Submitting proof to USC...');
            const txResponse = await this.usc.submitScoreFromQuery(
                proofData.chainKey,
                proofData.headerNumber,
                txBytes,  // use converted txBytes
                proofData.merkleProof.root,
                formattedSiblings,
                proofData.continuityProof.lowerEndpointDigest,
                proofData.continuityProof.roots,
                { gasLimit: 5_000_000 },
            );

            console.log(`[Step 8] Transaction sent: ${txResponse.hash}`);
            const receipt = await txResponse.wait();

            if (receipt.status === 0) {
                throw new InternalServerErrorException(
                    `Transaction mined but reverted. Hash: ${txResponse.hash}`
                );
            }

            console.log(`[Step 8] Proof successfully submitted: ${txResponse.hash}`);

            return { txHash: txResponse.hash };

        } catch (err: any) {
            // Re-throw NestJS HTTP exceptions untouched
            if (err?.status) throw err;

            console.error('[ProofService] Unhandled error:', err);
            throw new InternalServerErrorException(
                err?.shortMessage || err?.message || 'Unknown error occurred'
            );
        }
    }
}