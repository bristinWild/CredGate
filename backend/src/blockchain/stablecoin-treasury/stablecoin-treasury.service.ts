import { Injectable } from "@nestjs/common";
import { STABLECOINS } from "src/blockchain/stablecoin-treasury/stable.constants";

export interface StableTreasuryMetrics {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    transferCount: number;
    inflowCount: number;
    outflowCount: number;
}

@Injectable()
export class StablecoinTreasuryService {

    analyze(address: string, tokenTransfers: any[]): StableTreasuryMetrics {

        const user = address.toLowerCase();

        let totalInflow = 0;
        let totalOutflow = 0;
        let inflowCount = 0;
        let outflowCount = 0;

        if (!Array.isArray(tokenTransfers)) {
            return this.empty();
        }

        const stableList = Object.values(STABLECOINS)
            .map(c => c.toLowerCase());

        for (const tx of tokenTransfers) {

            const contract = tx.contractAddress?.toLowerCase();
            if (!stableList.includes(contract)) continue;

            const decimals = Number(tx.tokenDecimal);
            const value = Number(tx.value) / Math.pow(10, decimals);

            if (tx.to?.toLowerCase() === user) {
                totalInflow += value;
                inflowCount++;
            }

            if (tx.from?.toLowerCase() === user) {
                totalOutflow += value;
                outflowCount++;
            }
        }

        return {
            totalInflow,
            totalOutflow,
            netFlow: totalInflow - totalOutflow,
            transferCount: inflowCount + outflowCount,
            inflowCount,
            outflowCount
        };
    }

    private empty(): StableTreasuryMetrics {
        return {
            totalInflow: 0,
            totalOutflow: 0,
            netFlow: 0,
            transferCount: 0,
            inflowCount: 0,
            outflowCount: 0
        };
    }
}