import { Injectable } from "@nestjs/common";

export interface WalletMetrics {
    totalBorrows: number;
    totalRepays: number;
    totalLiquidations: number;
    repayRatio: number;
    liquidationRate: number;
    borrowRepayCycles: number;
}

@Injectable()
export class MetricsService {

    buildMetrics(aaveData: {
        borrows: any[];
        repays: any[];
        liquidations: any[];
    }) {

        const totalBorrows = aaveData.borrows.length;
        const totalRepays = aaveData.repays.length;
        const totalLiquidations = aaveData.liquidations.length;

        const repayRatio =
            totalBorrows === 0 ? 0 : totalRepays / totalBorrows;

        const liquidationRate =
            totalBorrows === 0 ? 0 : totalLiquidations / totalBorrows;

        const borrowRepayCycles =
            Math.min(totalBorrows, totalRepays);

        return {
            totalBorrows,
            totalRepays,
            totalLiquidations,
            repayRatio,
            liquidationRate,
            borrowRepayCycles,
        };
    }
}