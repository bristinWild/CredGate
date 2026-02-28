import { Injectable } from '@nestjs/common';
import { JsonRpcProvider } from 'ethers';
import { CrossChainMetrics } from 'src/crosschain/crosschain-metrics.interface';

@Injectable()
export class CrossChainService {

    private providers: Record<string, JsonRpcProvider>;

    constructor() {

        this.providers = {
            ethereum: new JsonRpcProvider(process.env.ETH_RPC),
            arbitrum: new JsonRpcProvider(process.env.ARB_RPC),
            optimism: new JsonRpcProvider(process.env.OP_RPC),
            base: new JsonRpcProvider(process.env.BASE_RPC),
            polygon: new JsonRpcProvider(process.env.POLYGON_RPC),
        };
    }

    async analyze(address: string): Promise<CrossChainMetrics> {

        const results: CrossChainMetrics["chainDetails"] = [];

        for (const [chain, provider] of Object.entries(this.providers)) {

            try {

                if (!provider) continue;

                const txCount = await provider.getTransactionCount(address);

                if (txCount === 0) {
                    results.push({
                        chain,
                        txCount: 0,
                        firstTxBlock: null,
                        walletAgeDays: null,
                    });
                    continue;
                }

                const latestBlock = await provider.getBlockNumber();

                // Soft heuristic but clamped
                const approxFirstBlock = Math.max(0, latestBlock - (txCount * 5));

                const walletAgeDays =
                    ((latestBlock - approxFirstBlock) * 12) / 86400;

                results.push({
                    chain,
                    txCount,
                    firstTxBlock: approxFirstBlock,
                    walletAgeDays,
                });

            } catch (error) {
                console.warn(`CrossChain scan failed on ${chain}`);
            }
        }

        const activeChains = results
            .filter(c => c.txCount > 0)
            .map(c => c.chain);

        const chainsUsedCount = activeChains.length;

        const totalTxAcrossChains = results
            .reduce((sum, c) => sum + c.txCount, 0);

        // -----------------------------
        // 🧠 WALLET CLASSIFICATION
        // -----------------------------

        let walletType: "HUMAN" | "HIGH_FREQUENCY" | "SYSTEM_OR_ROUTER" | "FRESH_WALLET";

        if (totalTxAcrossChains > 1_000_000) {
            walletType = "SYSTEM_OR_ROUTER";
        } else if (totalTxAcrossChains > 100_000) {
            walletType = "HIGH_FREQUENCY";
        } else if (totalTxAcrossChains < 10) {
            walletType = "FRESH_WALLET";
        } else {
            walletType = "HUMAN";
        }

        // -----------------------------
        // 🎯 Maturity Score Logic
        // -----------------------------

        let maturityScore = 0;

        if (chainsUsedCount >= 4) maturityScore += 40;
        else if (chainsUsedCount >= 3) maturityScore += 30;
        else if (chainsUsedCount >= 2) maturityScore += 20;
        else if (chainsUsedCount >= 1) maturityScore += 10;

        if (totalTxAcrossChains > 500) maturityScore += 30;
        else if (totalTxAcrossChains > 100) maturityScore += 20;
        else if (totalTxAcrossChains > 20) maturityScore += 10;

        maturityScore = Math.min(100, maturityScore);

        // -----------------------------
        // 🚨 Risk Impact Logic
        // -----------------------------

        let riskImpact = 0;

        if (walletType === "SYSTEM_OR_ROUTER") {
            riskImpact += 20; // treat as non-human risk
        }

        if (walletType === "HIGH_FREQUENCY") {
            riskImpact += 10;
        }

        if (walletType === "FRESH_WALLET") {
            riskImpact += 10;
        }

        if (chainsUsedCount >= 3 && maturityScore > 60 && walletType === "HUMAN") {
            riskImpact -= 15;
        }

        return {
            chainsUsedCount,
            activeChains,
            totalTxAcrossChains,
            chainDetails: results,
            crossChainMaturityScore: maturityScore,
            crossChainRiskImpact: riskImpact,
        };
    }
}
