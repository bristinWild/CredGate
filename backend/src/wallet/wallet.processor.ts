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
import { CrossChainService } from "src/crosschain/crosschain.service";
import { CrossChainMetrics } from "src/crosschain/crosschain-metrics.interface";
import { DexService } from "src/dex/dex.service";
import { DexMetrics } from "src/dex/dex-metrics.interface";

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
        scoreBreakdown: {
            lending: number;
            stable: number;
            crossChain: number;
            dex: number;
            ageBonus: number;
            riskPenalty: number;
        };
        stable: StableTreasuryMetrics & {
            stableScore: number;
            stableLevel: string;
        };
        crossChain: CrossChainMetrics
        dex: DexMetrics;

        loanProfile: {
            recommendedLTV: number;
            interestTier: string;
            maxLoanSizeUSD: number;
        }
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
        private readonly crosschainService: CrossChainService,
        private readonly dexService: DexService,
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
            console.log("Sample transfers:", JSON.stringify(tokenTransfers.slice(0, 3), null, 2));
            console.log("Total transfers:", tokenTransfers.length);
            const crossChainMetrics =
                await this.crosschainService.analyze(address);

            const dexMetrics = await this.dexService.analyze(address);

            const stableScore =
                this.stableScoreService.score(stableMetrics);

            const metrics =
                this.metricsService.buildMetrics(aaveActivity);

            const walletAgeDays =
                basicData.walletAgeBlocks
                    ? (basicData.walletAgeBlocks * 12) / 86400
                    : undefined;

            const risk = this.riskService.evaluate(
                metrics,
                { ...stableMetrics, ...stableScore },
                crossChainMetrics,
                dexMetrics,
                {
                    walletAgeDays,
                    totalTx: basicData.txCount
                }
            );



            const scoreResult =
                this.scoreService.calculateScore(
                    metrics,
                    risk,
                    stableScore,
                    crossChainMetrics,
                    dexMetrics,
                    basicData.walletAgeBlocks ?? undefined
                );

            const score = scoreResult.finalScore;

            const loanProfile = this.buildLoanProfile(
                score,
                risk.riskScore,
                stableMetrics,
                Number(basicData.ethBalance)
            );

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
                    scoreBreakdown: scoreResult.breakdown,
                    stable: {
                        ...stableMetrics,
                        ...stableScore
                    },
                    crossChain: crossChainMetrics,
                    dex: dexMetrics,
                    loanProfile,
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


    private buildLoanProfile(
        creditScore: number,
        riskScore: number,
        stableMetrics: {
            totalInflow: number;
            retentionRatio: number;
            netFlow: number;
            activeMonths: number;
            avgHoldingDays: number;
        },
        ethBalance: number
    ) {

        let recommendedLTV = 0;
        let interestTier = "REJECT";


        if (creditScore >= 75) {
            recommendedLTV = 70;
            interestTier = "PRIME";
        } else if (creditScore >= 60) {
            recommendedLTV = 60;
            interestTier = "PREFERRED";
        } else if (creditScore >= 45) {
            recommendedLTV = 50;
            interestTier = "STANDARD";
        } else if (creditScore >= 30) {
            recommendedLTV = 35;
            interestTier = "HIGH_RISK";
        }

        if (riskScore > 70) {
            recommendedLTV *= 0.5;
        } else if (riskScore > 55) {
            recommendedLTV *= 0.7;
        }

        // Capital based loan size
        let capitalBase = stableMetrics.totalInflow * stableMetrics.retentionRatio;
        if (stableMetrics.avgHoldingDays < 1) {
            capitalBase *= 0.1;
        }

        if (stableMetrics.activeMonths < 2) {
            capitalBase *= 0.3;
        }

        if (stableMetrics.netFlow < -1000) {
            const drainRatio = Math.abs(stableMetrics.netFlow) / (stableMetrics.totalInflow + 1);
            capitalBase *= Math.max(0.1, 1 - drainRatio);
        }

        capitalBase = Math.min(capitalBase, 500_000);

        const maxLoanSizeUSD = Math.max(
            0,
            capitalBase * (recommendedLTV / 100)
        );

        return {
            recommendedLTV: Math.round(recommendedLTV),
            interestTier,
            maxLoanSizeUSD: Math.floor(maxLoanSizeUSD)
        };
    }

    async getResult(address: string) {
        return jobStore.get(address.toLowerCase()) ?? {
            status: "NOT_FOUND"
        };
    }
}