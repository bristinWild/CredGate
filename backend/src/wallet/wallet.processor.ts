import { Injectable } from "@nestjs/common";
import { WalletHistoryService } from "src/blockchain/wallet-history.service";
import { AaveService } from "src/blockchain/aave.service";
import { MetricsService } from "src/scoring/metrics.service";
import { ScoreService } from "src/scoring/score.service";
import { RiskService } from "src/scoring/risk.service";
import { WalletMetrics } from "src/scoring/metrics.service";
import { WalletRisk } from "src/scoring/risk.service";
import { CreditRegistryService } from "src/blockchain/credit-registry.service";
import { StablecoinTreasuryService } from "src/blockchain/stablecoin-treasury/stablecoin-treasury.service";
import { StableTreasuryMetrics } from "src/blockchain/stablecoin-treasury/stablecoin-treasury.service";
import { StableScoreService } from "src/scoring/stable-score.service";

export interface WalletActivitySnapshot {
    address: string;

    basic: {
        ethBalance: string;
        txCount: number;
        walletAgeBlocks: number | null;
    };

    aave: {
        borrows: any[];
        repays: any[];
        liquidations: any[];
    };

    meta: {
        analyzedAt: number;
    };

    intelligence: {
        metrics: WalletMetrics;
        risk: WalletRisk;
        creditScore: number;
        stable: StableTreasuryMetrics & {
            stableScore: number;
            stableLevel: string;
        };
    };
    onchain: {
        status: "UPDATED" | "COOLDOWN_ACTIVE";
        txHash?: string;
        reportHash?: string;
        remainingSeconds?: number;
    };

}


const jobStore = new Map<string, any>();

@Injectable()
export class WalletProcessor {
    constructor(
        private readonly walletHistoryService: WalletHistoryService,
        private readonly aaveService: AaveService,
        private readonly metricsService: MetricsService,
        private readonly scoreService: ScoreService,
        private readonly riskService: RiskService,
        private readonly creditRegistryService: CreditRegistryService,
        private readonly stablecoinTreasuryService: StablecoinTreasuryService,
        private readonly stableScoreService: StableScoreService,
    ) { }

    private async processAsync(address: string) {
        try {
            console.time("PROCESS");

            const basicData =
                await this.walletHistoryService.getBasicWalletData(address);

            const aaveActivity =
                await this.aaveService.getUserAaveActivity(address);

            const tokenTransfers =
                await this.walletHistoryService.getTokenTransfers(address);
            console.log("Token transfers:", tokenTransfers.length);

            const stableMetrics =
                this.stablecoinTreasuryService.analyze(
                    address,
                    tokenTransfers
                );


            const stableScore =
                this.stableScoreService.score(stableMetrics);

            const metrics =
                this.metricsService.buildMetrics(aaveActivity);

            const risk = this.riskService.evaluate(metrics, {
                ...stableMetrics,
                ...stableScore
            });

            const score =
                this.scoreService.calculateScore(metrics, risk, basicData.walletAgeBlocks ?? undefined);

            const onChainResult =
                await this.creditRegistryService.pushScoreOnChain(
                    address,
                    metrics,
                    risk,
                    score,
                    stableScore.stableScore
                );

            const snapshot = {
                address,
                basic: {
                    ethBalance: basicData.ethBalance,
                    txCount: basicData.txCount,
                    walletAgeBlocks: basicData.walletAgeBlocks,
                },
                aave: {
                    borrows: aaveActivity.borrows,
                    repays: aaveActivity.repays,
                    liquidations: aaveActivity.liquidations,
                },
                meta: {
                    analyzedAt: Date.now(),
                },
                intelligence: {
                    metrics,
                    risk,
                    creditScore: score,
                    stable: {
                        ...stableMetrics,
                        ...stableScore
                    },
                },
                onchain: onChainResult,


            };



            jobStore.set(address, {
                status: "DONE",
                result: snapshot
            });

            console.timeEnd("PROCESS");

        } catch (error) {
            console.error("Async job failed:", error);

            jobStore.set(address, {
                status: "FAILED"
            });
        }
    }


    async startJob(address: string) {
        const normalized = address.toLowerCase();

        // Mark job as processing
        jobStore.set(normalized, {
            status: "PROCESSING"
        });

        // Run async in background
        this.processAsync(normalized);

        return {
            status: "PROCESSING"
        };
    }

    async getResult(address: string) {
        return jobStore.get(address.toLowerCase()) ?? {
            status: "NOT_FOUND"
        };
    }
}