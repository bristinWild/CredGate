import { Injectable } from "@nestjs/common";
import { StableTreasuryMetrics } from "src/blockchain/stablecoin-treasury/stablecoin-treasury.service";

@Injectable()
export class StableScoreService {

    score(metrics: StableTreasuryMetrics) {

        let score = 0;

        // Net Positive Capital (0–30 pts)
        if (metrics.netFlow > 1000) score += 30;
        else if (metrics.netFlow > 100) score += 20;
        else if (metrics.netFlow > 0) score += 10;

        // Activity Level (0–25 pts)
        if (metrics.transferCount > 100) score += 25;
        else if (metrics.transferCount > 40) score += 15;
        else if (metrics.transferCount > 10) score += 5;


        // Liquidity Balance Discipline (0–25 pts)
        const ratio =
            metrics.totalOutflow === 0
                ? 1
                : metrics.totalInflow / metrics.totalOutflow;


        if (ratio > 0.9 && ratio < 1.1) score += 15;
        else if (ratio > 0.7 && ratio < 1.3) score += 15;

        // Volume Strength (0–20 pts)
        if (metrics.totalInflow > 10000) score += 20;
        else if (metrics.totalInflow > 2000) score += 10;

        if (metrics.avgHoldingDays < 1) {
            score = Math.min(score, 70);
        }

        // Stability bonus (0–20)
        // Require at least 3 active months for full volatility trust
        if (metrics.activeMonths >= 3) {
            if (metrics.netFlowVolatility < 1000) score += 20;
            else if (metrics.netFlowVolatility < 5000) score += 10;
        } else if (metrics.activeMonths === 2) {
            // Partial trust
            if (metrics.netFlowVolatility < 1000) score += 10;
        } else {
            // Only 1 month → no stability bonus
        }

        // Retention bonus (0–15)
        if (metrics.retentionRatio > 0.9) score += 15;
        else if (metrics.retentionRatio > 0.7) score += 8;

        // Time consistency bonus (0–15 pts)
        if (metrics.activeMonths >= 12) score += 15;
        else if (metrics.activeMonths >= 6) score += 10;
        else if (metrics.activeMonths >= 3) score += 5;
        if (metrics.activeMonths < 3) score -= 20;
        else score -= 10; // penalize burst wallets


        if (metrics.avgHoldingDays > 60) score += 20;
        else if (metrics.avgHoldingDays > 30) score += 15;
        else if (metrics.avgHoldingDays > 7) score += 8;
        else score -= 25; // router penalty

        if (metrics.largestInflowSourceShare < 0.4) score += 15;
        else if (metrics.largestInflowSourceShare < 0.7) score += 8;
        else score -= 15;

        if (metrics.churnRatio < 0.00005) score += 15;
        else if (metrics.churnRatio < 0.0002) score += 8;
        else score -= 10;

        // Recency boost (0–10)
        score += metrics.recentActivityScore * 10;

        return {
            stableScore: Math.min(100, score),
            stableLevel:
                score > 75
                    ? "STRONG"
                    : score > 45
                        ? "MODERATE"
                        : "WEAK"
        };
    }
}