import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ProofService } from 'src/proof/proof.service';

const REGISTRY_ABI = [
    "event ScoreUpdated(address indexed user, uint256 creditScore, uint256 riskScore, uint256 stableScore, uint256 scoringVersion, uint256 timestamp, bytes32 reportHash)"
];

@Injectable()
export class RegistryWatcherService implements OnModuleInit {

    private readonly logger = new Logger(RegistryWatcherService.name);
    private provider: ethers.JsonRpcProvider;
    private contract: ethers.Contract;
    private processedTxHashes = new Set<string>();
    private processingTxHashes = new Set<string>();

    constructor(private readonly proofService: ProofService) {
        this.provider = new ethers.JsonRpcProvider(
            process.env.SEPOLIA_RPC_URL
        );

        this.contract = new ethers.Contract(
            process.env.CREDIT_REGISTRY_ADDRESS!,
            REGISTRY_ABI,
            this.provider
        );
    }

    async onModuleInit() {
        this.logger.log('Starting RegistryWatcher...');
        await this.catchUpMissedEvents();
        this.startListening();
    }

    // REAL-TIME LISTENER
    private startListening() {
        this.logger.log('Listening for ScoreUpdated events on Sepolia...');

        this.contract.on('ScoreUpdated', async (
            user,
            creditScore,
            riskScore,
            stableScore,
            scoringVersion,
            timestamp,
            reportHash,
            event
        ) => {
            const txHash = event.log.transactionHash;

            this.logger.log(`ScoreUpdated detected — user: ${user} tx: ${txHash}`);

            await this.handleTx(txHash, user);
        });

        // Handle provider disconnects
        this.provider.on('error', (error) => {
            this.logger.error('Provider error, reconnecting...', error.message);
            setTimeout(() => this.startListening(), 5000);
        });
    }

    // CATCH UP ON MISSED EVENTS (last 1000 blocks)
    // Handles case where worker was down and missed events
    private async catchUpMissedEvents() {
        try {
            this.logger.log('Catching up on missed events...');

            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);

            const CHUNK_SIZE = 9;
            const allEvents: any[] = [];

            for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
                const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);

                try {
                    const events = await this.contract.queryFilter(
                        this.contract.filters.ScoreUpdated(),
                        start,
                        end
                    );
                    allEvents.push(...events);
                } catch (err) {
                    this.logger.warn(`Chunk ${start}-${end} failed: ${err.message}`);
                }
            }

            this.logger.log(`Found ${allEvents.length} missed events`);

            for (const event of allEvents) {
                const txHash = event.transactionHash;
                const user = (event as any).args?.user;
                await this.handleTx(txHash, user);
            }

        } catch (error) {
            this.logger.error('Catch-up failed:', error.message);
        }
    }

    // CORE HANDLER — dedup + submit + poll
    private async handleTx(txHash: string, user: string) {
        // Dedup check
        if (
            this.processedTxHashes.has(txHash) ||
            this.processingTxHashes.has(txHash)
        ) {
            this.logger.debug(`Skipping already processed tx: ${txHash}`);
            return;
        }

        this.processingTxHashes.add(txHash);
        this.logger.log(`Processing tx: ${txHash} for user: ${user}`);

        try {
            // Submit to proof service
            const { jobId } = await this.proofService.processTransaction(txHash);
            this.logger.log(`Job started: ${jobId} for tx: ${txHash}`);

            // Poll until done
            await this.pollUntilComplete(jobId, txHash);

        } catch (error) {
            this.logger.error(`Failed to process tx ${txHash}:`, error.message);
            this.processingTxHashes.delete(txHash);
        }
    }


    // POLL JOB STATUS
    // Polls every 10 seconds, times out after 40 minutes

    private async pollUntilComplete(
        jobId: string,
        txHash: string
    ): Promise<void> {
        const MAX_ATTEMPTS = 240;  // 240 * 10s = 40 minutes
        const POLL_INTERVAL = 10_000;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            await this.sleep(POLL_INTERVAL);

            const result = this.proofService.getJobStatus(jobId);

            this.logger.debug(`Job ${jobId} status: ${result.status}`);

            if (result.status === 'success') {
                this.logger.log(
                    `Proof submitted for tx: ${txHash} | CreditCoin tx: ${result.txHash}`
                );
                this.processedTxHashes.add(txHash);
                this.processingTxHashes.delete(txHash);
                return;
            }

            if (result.status === 'failed') {
                this.logger.error(
                    `Proof failed for tx: ${txHash} | error: ${result.error}`
                );
                this.processingTxHashes.delete(txHash);
                return;
            }

            // Log progress for long-running steps
            if (result.status === 'waiting_attestation') {
                this.logger.log(
                    `Waiting for attestation... attempt ${attempt + 1}/${MAX_ATTEMPTS}`
                );
            }
        }

        this.logger.error(`Job ${jobId} timed out after 40 minutes`);
        this.processingTxHashes.delete(txHash);
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // STATUS , useful for health checks
    getStats() {
        return {
            processed: this.processedTxHashes.size,
            processing: this.processingTxHashes.size,
            processingHashes: Array.from(this.processingTxHashes),
        };
    }
}