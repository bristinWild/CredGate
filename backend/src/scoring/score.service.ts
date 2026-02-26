import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoreService {

    calculateScore(metrics: any, risk: any, walletAgeBlocks?: number) {
        let score = 0;

        // Core behavior scoring
        score += metrics.repayRatio * 40;
        score += metrics.borrowRepayCycles * 5;
        score -= metrics.liquidationRate * 50;
        score -= risk.riskScore;


        if (walletAgeBlocks && walletAgeBlocks > 0) {

            // Convert blocks → days (Ethereum ~12 sec per block)
            const walletAgeDays = (walletAgeBlocks * 12) / 86400;

            // Log scaling to prevent inflation
            const ageScore = Math.min(
                20,
                Math.log(walletAgeDays + 1) * 3
            );

            score += ageScore;
        }

        return Math.max(0, Math.min(100, Math.floor(score)));
    }
}
