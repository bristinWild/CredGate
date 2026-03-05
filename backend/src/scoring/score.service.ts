import { Injectable } from '@nestjs/common';
import { SCORE_WEIGHTS } from 'src/scoring/score-weights';

@Injectable()
export class ScoreService {

    calculateScore(
        metrics: any,
        risk: any,
        stable: any,
        crossChain: any,
        dex: any,
        walletAgeBlocks?: number
    ) {


        //  Lending

        let lendingScore = 0;

        if (metrics.totalBorrows > 0) {
            lendingScore += metrics.repayRatio * 30;
            lendingScore += metrics.borrowRepayCycles * 2;
            lendingScore -= metrics.liquidationRate * 30;
        }

        lendingScore = Math.max(
            0,
            Math.min(SCORE_WEIGHTS.lendingMax, lendingScore)
        );

        // Stable

        const stableScore = Math.min(
            35,
            (stable?.stableScore ?? 0) *
            SCORE_WEIGHTS.stableMultiplier
        );


        //  CrossChain

        const crossScore = Math.min(
            20,
            (crossChain?.crossChainMaturityScore ?? 0) *
            SCORE_WEIGHTS.crossChainMultiplier
        );

        const dexScore = Math.max(
            0,
            Math.min(
                15,
                (dex?.dexMaturityScore ?? 0) *
                SCORE_WEIGHTS.dexMultiplier
            )
        );

        //  Age Bonus

        let ageBonus = 0;

        if (walletAgeBlocks && walletAgeBlocks > 0) {
            const walletAgeDays =
                (walletAgeBlocks * 12) / 86400;

            ageBonus = Math.min(
                SCORE_WEIGHTS.ageMax,
                Math.log(walletAgeDays + 1) * 2.5
            );
        }


        // Risk Penalty

        const riskPenalty = Math.min(
            30,
            risk.riskScore *
            SCORE_WEIGHTS.riskPenaltyMultiplier
        );


        // Final Score

        const rawScore =
            lendingScore +
            stableScore +
            crossScore +
            dexScore +
            ageBonus -
            riskPenalty;


        const finalScore =
            Math.max(0, Math.min(100, Math.floor(rawScore)));

        return {
            finalScore,
            breakdown: {
                lending: Number(lendingScore.toFixed(2)),
                stable: Number(stableScore.toFixed(2)),
                crossChain: Number(crossScore.toFixed(2)),
                dex: Number(dexScore.toFixed(2)),
                ageBonus: Number(ageBonus.toFixed(2)),
                riskPenalty: Number(riskPenalty.toFixed(2)),
            }
        };
    }
}