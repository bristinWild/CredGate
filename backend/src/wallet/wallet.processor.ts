import { Injectable } from "@nestjs/common";
import { WalletHistoryService } from "src/blockchain/wallet-history.service";
import { AaveService } from "src/blockchain/aave.service";
import { MetricsService } from "src/scoring/metrics.service";
import { ScoreService } from "src/scoring/score.service";
import { RiskService } from "src/scoring/risk.service";
import { WalletMetrics } from "src/scoring/metrics.service";
import { WalletRisk } from "src/scoring/risk.service";
import { CreditRegistryService } from "src/blockchain/credit-registry.service";

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
    };
}

const AAVE_DEPLOY_BLOCK = 16291127; // Aave V3 Mainnet deploy


@Injectable()
export class WalletProcessor {
    constructor(
        private readonly walletHistoryService: WalletHistoryService,
        private readonly aaveService: AaveService,
        private readonly metricsService: MetricsService,
        private readonly scoreService: ScoreService,
        private readonly riskService: RiskService,
        private readonly creditRegistryService: CreditRegistryService,
    ) { }




    async process(address: string): Promise<WalletActivitySnapshot> {
        const basicData =
            await this.walletHistoryService.getBasicWalletData(address);

        const fromBlock = AAVE_DEPLOY_BLOCK;

        const aaveActivity =
            await this.aaveService.getUserAaveActivity(
                address,
                fromBlock
            );

        const walletAgeBlocks =
            await this.walletHistoryService.getWalletAgeInBlocks(address);

        const activityLevel =
            Math.min(100, basicData.txCount / 20);

        const ethBalanceScore =
            Math.min(100, Number(basicData.ethBalance) * 10);

        const metrics =
            this.metricsService.buildMetrics(aaveActivity);

        const risk =
            this.riskService.evaluate(metrics);

        const score =
            this.scoreService.calculateScore(metrics, risk);

        const onChainResult =
            await this.creditRegistryService.pushScoreOnChain(
                address,
                metrics,
                risk,
                score
            );


        return {
            address,
            basic: {
                ethBalance: basicData.ethBalance,
                txCount: basicData.txCount,
                walletAgeBlocks: null, // temporarily disabled
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
            }
        };
    }
}