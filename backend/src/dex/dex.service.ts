import { Injectable } from '@nestjs/common';
import { DexMetrics } from 'src/dex/dex-metrics.interface';
import axios from 'axios';

@Injectable()
export class DexService {

    private endpoints = {
        ethereum: process.env.UNI_V3_ETH,
        arbitrum: process.env.UNI_V3_ARB,
        base: process.env.UNI_V3_BASE,
    };

    private getEmptyMetrics(): DexMetrics {
        return {
            totalSwaps: 0,
            totalVolumeUSD: 0,
            uniqueTokensTraded: 0,
            avgSwapSizeUSD: 0,
            swapFrequencyPerMonth: 0,
            dexMaturityScore: 0,
            dexRiskImpact: 0,
        };
    }

    async analyze(address: string): Promise<DexMetrics> {

        const normalized = address.toLowerCase();
        let allSwaps: any[] = [];

        for (const [chain, endpoint] of Object.entries(this.endpoints)) {

            if (!endpoint) continue;

            try {
                const swaps = await this.fetchSwaps(endpoint, normalized);
                allSwaps.push(...swaps);
            } catch (error) {
                console.error(`DEX fetch failed for ${chain}`, error.response?.data || error.message);
            }
        }

        if (!allSwaps.length) {
            return this.getEmptyMetrics();
        }

        const uniqueMap = new Map<string, any>();

        allSwaps.forEach(swap => {
            uniqueMap.set(swap.id, swap);
        });

        allSwaps = Array.from(uniqueMap.values());

        return this.buildMetrics(allSwaps);
    }

    private async fetchSwaps(endpoint: string, address: string) {

        const allSwaps: any[] = [];
        let skip = 0;
        const MAX_SWAPS = 3000;

        while (true) {

            const query = `
      query GetSwaps($user: Bytes!, $skip: Int!) {
        swaps(
          first: 1000
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
          where: { origin: $user }
        ) {
          id
          timestamp
          amountUSD
          token0 { id symbol }
          token1 { id symbol }
        }
      }
    `;

            console.log("Calling endpoint:", endpoint);
            console.log("Address:", address);
            const response = await axios.post(
                endpoint,
                {
                    query,
                    variables: {
                        user: address,
                        skip,
                    },
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );



            const swaps = response.data?.data?.swaps ?? [];
            console.log("Swaps returned:", swaps.length);

            allSwaps.push(...swaps);

            if (swaps.length < 1000) break;

            skip += 1000;

            if (allSwaps.length >= MAX_SWAPS) break;
        }

        return allSwaps;
    }


    private buildMetrics(swaps: any[]): DexMetrics {

        const totalSwaps = swaps.length;

        const totalVolumeUSD = swaps.reduce(
            (sum, s) => sum + Number(s.amountUSD || 0),
            0
        );

        const tokenSet = new Set<string>();

        swaps.forEach(s => {
            if (s.token0?.id) tokenSet.add(s.token0.id);
            if (s.token1?.id) tokenSet.add(s.token1.id);
        });

        const uniqueTokensTraded = tokenSet.size;

        const avgSwapSizeUSD =
            totalSwaps > 0 ? totalVolumeUSD / totalSwaps : 0;

        // TIME METRICS
        const timestamps = swaps
            .map(s => Number(s.timestamp))
            .filter(t => !isNaN(t));

        if (!timestamps.length) {
            return this.getEmptyMetrics();
        }

        const first = Math.min(...timestamps);
        const last = Math.max(...timestamps);

        const activeDays = (last - first) / 86400;
        const activeMonths = Math.max(1, activeDays / 30);

        const swapFrequencyPerMonth =
            totalSwaps / activeMonths;

        // LOG-BASED MATURITY
        const volumeScore =
            Math.min(30, Math.log10(totalVolumeUSD + 1) * 5);

        const swapScore =
            Math.min(25, Math.log10(totalSwaps + 1) * 8);

        const tokenScore =
            Math.min(15, uniqueTokensTraded * 1.5);

        const freqScore =
            Math.min(20, swapFrequencyPerMonth * 0.5);

        const longevityScore =
            Math.min(10, activeMonths * 1.5);

        let dexMaturityScore =
            volumeScore +
            swapScore +
            tokenScore +
            freqScore +
            longevityScore;

        dexMaturityScore = Math.min(100, dexMaturityScore);

        // RISK LOGIC
        let dexRiskImpact = 0;

        if (swapFrequencyPerMonth > 200 && avgSwapSizeUSD < 10)
            dexRiskImpact += 10;

        if (uniqueTokensTraded > 50)
            dexRiskImpact += 5;

        if (swapFrequencyPerMonth > 1000)
            dexRiskImpact += 15;

        return {
            totalSwaps,
            totalVolumeUSD,
            uniqueTokensTraded,
            avgSwapSizeUSD,
            swapFrequencyPerMonth,
            dexMaturityScore,
            dexRiskImpact,
        };
    }


}