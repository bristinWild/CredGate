import { Injectable } from "@nestjs/common";

export interface WalletRisk {
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

@Injectable()
export class RiskService {

    evaluate(metrics: any): WalletRisk {

        let risk = 0;

        if (metrics.liquidationRate > 0.2) risk += 40;
        if (metrics.repayRatio < 0.5) risk += 30;
        if (metrics.borrowRepayCycles < 3) risk += 10;

        let riskLevel: "LOW" | "MEDIUM" | "HIGH";

        if (risk > 60) {
            riskLevel = "HIGH";
        } else if (risk > 30) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        return {
            riskScore: Math.min(100, risk),
            riskLevel,
        };
    }
}