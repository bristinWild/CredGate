import { Injectable } from "@nestjs/common";

export interface WalletRisk {
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

@Injectable()
export class RiskService {

    evaluate(aaveMetrics: any, stableMetrics?: any): WalletRisk {

        let risk = 40; // Base neutral risk

        if (aaveMetrics.liquidationRate > 0.2) {
            risk += 40;
        }

        if (aaveMetrics.repayRatio < 0.5 && aaveMetrics.totalBorrows > 0) {
            risk += 25;
        }

        if (aaveMetrics.borrowRepayCycles < 3 && aaveMetrics.totalBorrows > 0) {
            risk += 10;
        }

        if (stableMetrics) {

            // Strong treasury lowers risk
            if (stableMetrics.stableScore > 70) {
                risk -= 20;
            }
            else if (stableMetrics.stableScore > 50) {
                risk -= 10;
            }

            // Weak treasury increases risk
            if (stableMetrics.stableScore < 20) {
                risk += 15;
            }

            // Large negative net flow increases risk
            if (stableMetrics.netFlow < -1000) {
                risk += 10;
            }
        }

        // Clamp risk between 0 and 100
        risk = Math.max(0, Math.min(100, risk));

        let riskLevel: "LOW" | "MEDIUM" | "HIGH";

        if (risk > 70) {
            riskLevel = "HIGH";
        } else if (risk > 40) {
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