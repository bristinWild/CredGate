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

        if (ratio > 0.9 && ratio < 1.1) score += 25;
        else if (ratio > 0.7 && ratio < 1.3) score += 15;

        // Volume Strength (0–20 pts)
        if (metrics.totalInflow > 10000) score += 20;
        else if (metrics.totalInflow > 2000) score += 10;

        return {
            stableScore: score,
            stableLevel:
                score > 70
                    ? "STRONG"
                    : score > 40
                        ? "MODERATE"
                        : "WEAK"
        };
    }
}