import { CredGateClient } from "../client";
import { ScoreResult, ProofStatus, OnChainStatus } from "../types";
export interface UseCredGateOptions {
    /** Auto-trigger analysis on mount if no score cached (default: false) */
    autoAnalyze?: boolean;
    /** Proof poll interval in ms. 0 = disabled (default: 5000) */
    proofPollInterval?: number;
}
export interface UseCredGateReturn {
    /** Latest credit score result */
    score: ScoreResult | null;
    /** Latest CreditCoin ZK proof status */
    proof: ProofStatus | null;
    /** On-chain credit registry status */
    onchain: OnChainStatus | null;
    /** True while loading cached score on mount */
    loading: boolean;
    /** True while analysis POST + polling is in progress */
    analyzing: boolean;
    /** Human-readable error string */
    error: string | null;
    /** Seconds remaining in cooldown (0 = no cooldown) */
    cooldownRemaining: number;
    /** Trigger a new wallet analysis */
    analyze: () => Promise<void>;
    /** Re-fetch cached data without triggering new analysis */
    refetch: () => Promise<void>;
}
/**
 * Full React hook for CredGate credit scoring.
 *
 * @example
 * const client = new CredGateClient({ apiUrl: "https://api.credgate.xyz" });
 *
 * function CreditWidget() {
 *   const { address } = useAccount();
 *   const { score, proof, analyzing, cooldownRemaining, analyze } = useCredGate(client, address);
 *
 *   return (
 *     <div>
 *       <p>Score: {score?.creditScore ?? "—"}/100  Tier: {score?.tier}</p>
 *       <p>Max loan: ${score?.loanProfile.maxLoanSizeUSD ?? 0}</p>
 *       <p>Proof: {proof?.status}</p>
 *       <button onClick={analyze} disabled={analyzing || cooldownRemaining > 0}>
 *         {cooldownRemaining > 0 ? `Cooldown: ${cooldownRemaining}s` : "Analyze"}
 *       </button>
 *     </div>
 *   );
 * }
 */
export declare function useCredGate(client: CredGateClient, address: string | undefined, options?: UseCredGateOptions): UseCredGateReturn;
/**
 * Minimal hook — just score, tier, eligibility.
 * Perfect for simple loan-gating use cases.
 *
 * @example
 * const { eligible, maxLoan, tier, analyze } = useSimpleScore(client, address);
 * if (!eligible) return <div>Not eligible to borrow</div>;
 */
export declare function useSimpleScore(client: CredGateClient, address: string | undefined): {
    creditScore: number | null;
    tier: import("../types").CreditTier | null;
    maxLoan: number;
    recommendedLTV: number;
    eligible: boolean;
    loading: boolean;
    error: string | null;
    cooldownRemaining: number;
    analyze: () => Promise<void>;
};
//# sourceMappingURL=hooks.d.ts.map