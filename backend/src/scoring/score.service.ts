import { Injectable } from '@nestjs/common';

@Injectable()
export class ScoreService {

    calculateScore(metrics: any, risk: any) {

        let score = 0;

        score += metrics.repayRatio * 40;
        score += metrics.borrowRepayCycles * 5;
        score -= metrics.liquidationRate * 50;
        score -= risk.riskScore;

        return Math.max(0, Math.min(100, Math.floor(score)));
    }
}
