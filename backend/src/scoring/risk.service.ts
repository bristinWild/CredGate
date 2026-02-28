import { Injectable } from "@nestjs/common";

export interface WalletRisk {
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

@Injectable()
export class RiskService {

    evaluate(
        aaveMetrics: any,
        stableMetrics?: any,
        crossChainMetrics?: any,
        dex?: any,
        behavior?: {
            walletAgeDays?: number;
            totalTx?: number;
        }
    ): WalletRisk {

        let risk = 35;

        // AAVE RISK
        if (aaveMetrics.liquidationRate > 0.3) {
            risk += 60;
        } else if (aaveMetrics.liquidationRate > 0.15) {
            risk += 40;
        }

        if (aaveMetrics.totalLiquidations > 0) {
            risk += 20;
        }

        if (aaveMetrics.repayRatio < 0.5 && aaveMetrics.totalBorrows > 0) {
            risk += 25;
        }

        if (aaveMetrics.borrowRepayCycles < 3 && aaveMetrics.totalBorrows > 0) {
            risk += 10;
        }

        // STABLE TREASURY
        if (stableMetrics) {

            if (stableMetrics.largestInflowSourceShare > 0.9) {
                risk += 15;
            }

            if (stableMetrics.stableScore > 70) {
                risk -= 20;
            } else if (stableMetrics.stableScore > 50) {
                risk -= 10;
            }

            if (stableMetrics.stableScore < 20) {
                risk += 15;
            }

            if (stableMetrics.netFlow < -1000) {
                risk += 10;
            }
        }

        // CROSSCHAIN
        if (crossChainMetrics) {
            risk += crossChainMetrics.crossChainRiskImpact;
        }

        // BURST WALLET RISK
        if (behavior?.walletAgeDays && behavior?.totalTx) {

            if (behavior.walletAgeDays < 30) {

                const txPerDay =
                    behavior.totalTx / behavior.walletAgeDays;

                if (txPerDay > 1000) {
                    risk += 25;
                } else if (txPerDay > 500) {
                    risk += 20;
                } else if (txPerDay > 200) {
                    risk += 10;
                }

            }
        }

        // DEX RISK
        risk += dex?.dexRiskImpact ?? 0;

        risk = Math.max(0, Math.min(100, risk));

        let riskLevel: "LOW" | "MEDIUM" | "HIGH";

        if (risk > 65) {
            riskLevel = "HIGH";
        } else if (risk > 35) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        return {
            riskScore: risk,
            riskLevel,
        };
    }
}