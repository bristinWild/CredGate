export interface CrossChainMetrics {
    chainsUsedCount: number;
    activeChains: string[];
    totalTxAcrossChains: number;
    chainDetails: {
        chain: string;
        txCount: number;
        firstTxBlock: number | null;
        walletAgeDays: number | null;
    }[];
    crossChainMaturityScore: number;
    crossChainRiskImpact: number;
}