import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ProofService } from 'src/proof/proof.service';

const REGISTRY_ABI = [
    "event ScoreUpdated(address indexed user, uint256 creditScore, uint256 riskScore, uint256 stableScore, uint256 scoringVersion, uint256 timestamp, bytes32 reportHash)"
];

@Injectable()
export class RegistryWatcherService implements OnModuleInit {

    private readonly logger = new Logger(RegistryWatcherService.name);
    private provider: ethers.WebSocketProvider;
    private contract: ethers.Contract;
    private processedTxHashes = new Set<string>();
    private processingTxHashes = new Set<string>();

    constructor(private readonly proofService: ProofService) {
        this.provider = new ethers.WebSocketProvider(
            process.env.SEPOLIA_WS_URL!
        );

        this.contract = new ethers.Contract(
            process.env.CREDIT_REGISTRY_ADDRESS!,
            REGISTRY_ABI,
            this.provider
        );
    }

    async onModuleInit() {
        this.logger.log('Starting RegistryWatcher...');
        this.startListening();
    }

    async runCatchUp() {
        await this.catchUpMissedEvents();
    }

    // REAL-TIME LISTENER
    private startListening() {
        this.logger.log('Listening for ScoreUpdated events on Sepolia...');

        this.contract.on('ScoreUpdated', async (
            ...args
        ) => {
            const event = args[args.length - 1];
            const user = event.args?.user ?? args[0];
            const txHash = event.log.transactionHash;
            this.logger.log(`ScoreUpdated detected — user: ${user} tx: ${txHash}`);
            await this.handleTx(txHash, user);
        });

        // ethers v6 WebSocketProvider reconnection
        const ws = this.provider as ethers.WebSocketProvider;
        ws.websocket.onerror = (err: any) => {
            this.logger.warn('WebSocket closed, reconnecting in 5s...');
            setTimeout(() => this.reconnect(), 5000);
        };

        ws.websocket.onerror = (err: any) => {
            this.logger.error('WebSocket error:', err?.message ?? err);
        };
    }

    private async reconnect() {
        try {
            // Remove old listeners before reconnecting
            await this.contract.removeAllListeners();

            this.provider = new ethers.WebSocketProvider(
                process.env.SEPOLIA_WS_URL!
            );
            this.contract = new ethers.Contract(
                process.env.CREDIT_REGISTRY_ADDRESS!,
                REGISTRY_ABI,
                this.provider
            );
            await this.catchUpMissedEvents();
            this.startListening();
            this.logger.log('Reconnected successfully');
        } catch (err) {
            this.logger.error('Reconnect failed, retrying in 5s...', err.message);
            setTimeout(() => this.reconnect(), 5000);
        }
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
                console.log(`[CatchUp] event args:`, (event as any).args);
                await this.handleTx(txHash, user);
            }

        } catch (error) {
            this.logger.error('Catch-up failed:', error.message);
        }
    }

    // CORE HANDLER — dedup + submit + poll
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
                if (result.error?.includes('Query already processed')) {
                    this.logger.log(
                        ` Tx already processed on-chain, skipping: ${txHash}`
                    );
                    this.processedTxHashes.add(txHash);
                    this.processingTxHashes.delete(txHash);
                    return;
                }

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