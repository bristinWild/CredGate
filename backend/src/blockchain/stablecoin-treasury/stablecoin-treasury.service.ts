import { Injectable } from "@nestjs/common";
import { STABLECOINS } from "src/blockchain/stablecoin-treasury/stable.constants";

export interface StableTreasuryMetrics {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    transferCount: number;
    inflowCount: number;
    outflowCount: number;

    avgMonthlyNetFlow: number;
    netFlowVolatility: number;
    retentionRatio: number;
    recentActivityScore: number;
    activeMonths: number;
    avgHoldingDays: number;
    largestInflowSourceShare: number;
    churnRatio: number;
}

@Injectable()
export class StablecoinTreasuryService {

    analyze(address: string, tokenTransfers: any[]): StableTreasuryMetrics {

        const user = address.toLowerCase();

        let totalInflow = 0;
        let totalOutflow = 0;
        let inflowCount = 0;
        let outflowCount = 0;

        const monthlyBuckets: Record<string, number> = {};
        const inflowSources: Record<string, number> = {};

        if (!Array.isArray(tokenTransfers)) {
            return this.empty();
        }

        const stableList = Object.values(STABLECOINS)
            .map(c => c.toLowerCase());

        const now = Date.now() / 1000;

        const inflowQueue: { value: number; timestamp: number }[] = [];
        let totalHoldingDays = 0;
        let matchedOutflows = 0;

        for (const tx of tokenTransfers) {

            const contract = tx.contractAddress?.toLowerCase();
            if (!stableList.includes(contract)) continue;

            const decimals = Number(tx.tokenDecimal);
            const value = Number(tx.value) / Math.pow(10, decimals);

            const timestamp = Number(tx.timeStamp);
            const monthKey = new Date(timestamp * 1000)
                .toISOString()
                .slice(0, 7);

            if (!monthlyBuckets[monthKey]) {
                monthlyBuckets[monthKey] = 0;
            }

            // INFLOW
            if (tx.to?.toLowerCase() === user) {

                totalInflow += value;
                inflowCount++;
                monthlyBuckets[monthKey] += value;

                const source = tx.from?.toLowerCase();
                if (source) {
                    if (!inflowSources[source]) inflowSources[source] = 0;
                    inflowSources[source] += value;
                }

                inflowQueue.push({
                    value,
                    timestamp
                });
            }

            // OUTFLOW
            if (tx.from?.toLowerCase() === user) {

                totalOutflow += value;
                outflowCount++;
                monthlyBuckets[monthKey] -= value;

                let remaining = value;

                while (remaining > 0 && inflowQueue.length > 0) {
                    const inflow = inflowQueue[0];

                    const matched = Math.min(inflow.value, remaining);

                    const holdingDays =
                        (timestamp - inflow.timestamp) / 86400;

                    totalHoldingDays += holdingDays;
                    matchedOutflows++;

                    inflow.value -= matched;
                    remaining -= matched;

                    if (inflow.value <= 0) {
                        inflowQueue.shift();
                    }
                }
            }
        }

        const transferCount = inflowCount + outflowCount;

        const churnRatio =
            totalInflow === 0
                ? 0
                : transferCount / (totalInflow + 1);



        const inflowValues = Object.values(inflowSources);

        const largestInflow =
            inflowValues.length === 0
                ? 0
                : Math.max(...inflowValues);

        const largestInflowSourceShare =
            totalInflow === 0
                ? 0
                : largestInflow / totalInflow;


        const avgHoldingDays =
            matchedOutflows === 0
                ? 0
                : totalHoldingDays / matchedOutflows;


        const monthlyNetFlows = Object.values(monthlyBuckets);

        const avgMonthlyNetFlow =
            monthlyNetFlows.length === 0
                ? 0
                : monthlyNetFlows.reduce((a, b) => a + b, 0) /
                monthlyNetFlows.length;

        const variance =
            monthlyNetFlows.length === 0
                ? 0
                : monthlyNetFlows.reduce(
                    (sum, val) =>
                        sum + Math.pow(val - avgMonthlyNetFlow, 2),
                    0
                ) / monthlyNetFlows.length;

        const rawVolatility = Math.sqrt(variance);

        const netFlowVolatility =
            avgMonthlyNetFlow === 0
                ? rawVolatility
                : rawVolatility / Math.abs(avgMonthlyNetFlow);

        const retentionRatio =
            totalInflow === 0
                ? 0
                : Math.max(0, 1 - Math.abs(totalOutflow - totalInflow) / totalInflow);

        // Time Decay Weighting
        let recentWeight = 0;

        for (const tx of tokenTransfers) {
            const timestamp = Number(tx.timeStamp);
            const ageDays = (now - timestamp) / 86400;

            if (ageDays < 90) recentWeight += 1;
            else if (ageDays < 365) recentWeight += 0.5;
            else recentWeight += 0.2;
        }

        const recentActivityScore =
            tokenTransfers.length === 0
                ? 0
                : recentWeight / tokenTransfers.length;

        const activeMonths = Object.keys(monthlyBuckets).length;
        console.log("Monthly buckets:", monthlyBuckets);
        console.log("Active months:", activeMonths);

        return {
            totalInflow,
            totalOutflow,
            netFlow: totalInflow - totalOutflow,
            transferCount: inflowCount + outflowCount,
            inflowCount,
            outflowCount,
            avgMonthlyNetFlow,
            netFlowVolatility,
            retentionRatio,
            recentActivityScore,
            activeMonths,
            avgHoldingDays,
            largestInflowSourceShare,
            churnRatio,
        };
    }

    private empty(): StableTreasuryMetrics {
        return {
            totalInflow: 0,
            totalOutflow: 0,
            netFlow: 0,
            transferCount: 0,
            inflowCount: 0,
            outflowCount: 0,
            avgMonthlyNetFlow: 0,
            netFlowVolatility: 0,
            retentionRatio: 0,
            recentActivityScore: 0,
            activeMonths: 0,
            avgHoldingDays: 0,
            largestInflowSourceShare: 0,
            churnRatio: 0,

        };
    }
}