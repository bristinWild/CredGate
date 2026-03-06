import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ProofService } from 'src/proof/proof.service';

const REGISTRY_ABI = [
    "event ScoreUpdated(address indexed user, uint256 creditScore, uint256 riskScore, uint256 stableScore, uint256 scoringVersion, uint256 timestamp, bytes32 reportHash)"
];

@Injectable()
export class RegistryWatcherService implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(RegistryWatcherService.name);
    private provider: ethers.JsonRpcProvider;
    private contract: ethers.Contract;
    private processedTxHashes = new Set<string>();
    private processingTxHashes = new Set<string>();
    private lastScannedBlock: number | null = null;
    private pollTimer: NodeJS.Timeout | null = null;
    private readonly POLL_INTERVAL = 12_000;

    constructor(private readonly proofService: ProofService) {
        this.provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        this.contract = new ethers.Contract(
            process.env.CREDIT_REGISTRY_ADDRESS!,
            REGISTRY_ABI,
            this.provider
        );
    }

    async onModuleInit() {
        this.logger.log('Starting RegistryWatcher...');
        this.logger.log('Listening for ScoreUpdated events on Sepolia...');

        try {
            const current = await this.provider.getBlockNumber();
            this.lastScannedBlock = Math.max(0, current - 10);
        } catch (err) {
            this.logger.warn('Could not fetch block number on init, will retry on first poll');
        }

        this.schedulePoll();
    }

    onModuleDestroy() {
        if (this.pollTimer) clearTimeout(this.pollTimer);
    }

    private schedulePoll() {
        this.pollTimer = setTimeout(() => this.poll(), this.POLL_INTERVAL);
    }

    private async poll() {
        try {
            const currentBlock = await this.provider.getBlockNumber();

            if (this.lastScannedBlock === null) {
                this.lastScannedBlock = Math.max(0, currentBlock - 10);
            }

            if (currentBlock <= this.lastScannedBlock) {
                return;
            }

            const fromBlock = this.lastScannedBlock + 1;
            const toBlock = currentBlock;


            const CHUNK = 50;
            for (let start = fromBlock; start <= toBlock; start += CHUNK) {
                const end = Math.min(start + CHUNK - 1, toBlock);
                try {
                    const events = await this.contract.queryFilter(
                        this.contract.filters.ScoreUpdated(),
                        start,
                        end
                    );

                    for (const event of events) {
                        const txHash = event.transactionHash;
                        const user = (event as any).args?.user;
                        this.logger.log(`ScoreUpdated detected — user: ${user} tx: ${txHash}`);
                        await this.handleTx(txHash, user);
                    }
                } catch (err: any) {
                    this.logger.warn(`Chunk ${start}-${end} failed: ${err.message}`);
                }
            }

            this.lastScannedBlock = toBlock;

        } catch (err: any) {
            this.logger.error(`Poll failed: ${err.message}`);
        } finally {
            this.schedulePoll();
        }
    }

    async runCatchUp() {
        try {
            this.logger.log('Catching up on missed events...');
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);
            const CHUNK_SIZE = 50;

            for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
                const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
                try {
                    const events = await this.contract.queryFilter(
                        this.contract.filters.ScoreUpdated(),
                        start,
                        end
                    );
                    for (const event of events) {
                        const txHash = event.transactionHash;
                        const user = (event as any).args?.user;
                        await this.handleTx(txHash, user);
                    }
                } catch (err: any) {
                    this.logger.warn(`CatchUp chunk ${start}-${end} failed: ${err.message}`);
                }
            }
        } catch (error: any) {
            this.logger.error('Catch-up failed:', error.message);
        }
    }

    private async handleTx(txHash: string, user: string) {
        if (
            this.processedTxHashes.has(txHash) ||
            this.processingTxHashes.has(txHash)
        ) {
            this.logger.debug(`Skipping already tracked tx: ${txHash}`);
            return;
        }

        this.processingTxHashes.add(txHash);
        this.logger.log(`Processing tx: ${txHash} for user: ${user}`);

        try {
            console.log(`[RegistryWatcher] Calling processTransaction with user: ${user}`);
            const { jobId } = await this.proofService.processTransaction(txHash, user);
            this.logger.log(`Job started: ${jobId} for tx: ${txHash}`);
            await this.pollUntilComplete(jobId, txHash);
        } catch (error: any) {
            this.logger.error(`Failed to process tx ${txHash}:`, error.message);
            this.processingTxHashes.delete(txHash);
        }
    }

    private async pollUntilComplete(jobId: string, txHash: string): Promise<void> {
        const MAX_ATTEMPTS = 240;
        const POLL_INTERVAL = 10_000;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            await this.sleep(POLL_INTERVAL);
            const result = this.proofService.getJobStatus(jobId);
            this.logger.debug(`Job ${jobId} status: ${result.status}`);

            if (result.status === 'success') {
                this.logger.log(`Proof submitted for tx: ${txHash} | CreditCoin tx: ${result.txHash}`);
                this.processedTxHashes.add(txHash);
                this.processingTxHashes.delete(txHash);
                return;
            }

            if (result.status === 'failed') {
                if (result.error?.includes('Query already processed')) {
                    this.logger.log(`Tx already processed on-chain, skipping: ${txHash}`);
                    this.processedTxHashes.add(txHash);
                    this.processingTxHashes.delete(txHash);
                    return;
                }
                this.logger.error(`Proof failed for tx: ${txHash} | error: ${result.error}`);
                this.processingTxHashes.delete(txHash);
                return;
            }

            if (result.status === 'waiting_attestation') {
                this.logger.log(`Waiting for attestation... attempt ${attempt + 1}/${MAX_ATTEMPTS}`);
            }
        }

        this.logger.error(`Job ${jobId} timed out after 40 minutes`);
        this.processingTxHashes.delete(txHash);
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            processed: this.processedTxHashes.size,
            processing: this.processingTxHashes.size,
            processingHashes: Array.from(this.processingTxHashes),
            lastScannedBlock: this.lastScannedBlock,
        };
    }
}