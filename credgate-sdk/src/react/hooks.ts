import { useState, useEffect, useCallback, useRef } from "react";
import { CredGateClient } from "../client";
import {
    ScoreResult,
    ProofStatus,
    OnChainStatus,
    CredGateError,
    ErrorCode,
} from "../types";

// ── useCredGate ───────────────────────────────────────────────────────────────
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
export function useCredGate(
    client: CredGateClient,
    address: string | undefined,
    options: UseCredGateOptions = {},
): UseCredGateReturn {
    const { autoAnalyze = false, proofPollInterval = 5000 } = options;

    const [score, setScore] = useState<ScoreResult | null>(null);
    const [proof, setProof] = useState<ProofStatus | null>(null);
    const [onchain, setOnchain] = useState<OnChainStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    const proofPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopProofPolling = useCallback(() => {
        if (proofPollRef.current) {
            clearInterval(proofPollRef.current);
            proofPollRef.current = null;
        }
    }, []);

    const startProofPolling = useCallback((addr: string) => {
        if (!proofPollInterval || proofPollRef.current) return;
        proofPollRef.current = setInterval(async () => {
            try {
                const p = await client.getProofStatus(addr);
                setProof(p);
                if (p.status === "success" || p.status === "failed" || p.status === "not_found") {
                    stopProofPolling();
                }
            } catch {

            }
        }, proofPollInterval);
    }, [client, proofPollInterval, stopProofPolling]);

    const startCooldown = useCallback((seconds: number) => {
        setCooldownRemaining(seconds);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setCooldownRemaining((prev) => {
                if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    }, []);


    const refetch = useCallback(async () => {
        if (!address) return;
        setLoading(true);
        setError(null);
        try {
            const [scoreRes, proofRes, onchainRes] = await Promise.allSettled([
                client.getScore(address),
                client.getProofStatus(address),
                client.getOnChainStatus(address),
            ]);

            if (scoreRes.status === "fulfilled") setScore(scoreRes.value);
            if (proofRes.status === "fulfilled") setProof(proofRes.value);
            if (onchainRes.status === "fulfilled") setOnchain(onchainRes.value);


            if (
                proofRes.status === "fulfilled" &&
                proofRes.value.status !== "success" &&
                proofRes.value.status !== "failed" &&
                proofRes.value.status !== "not_found"
            ) {
                startProofPolling(address);
            }
        } finally {
            setLoading(false);
        }
    }, [address, client, startProofPolling]);


    const analyze = useCallback(async () => {
        if (!address) return;
        setAnalyzing(true);
        setError(null);
        setProof(null);
        stopProofPolling();

        try {
            const result = await client.analyzeWallet(address);
            setScore(result.score);
            setOnchain(result.onchain);
            if (result.proof) setProof(result.proof);


            startProofPolling(address);
        } catch (err) {
            if (err instanceof CredGateError) {
                if (err.code === ErrorCode.COOLDOWN_ACTIVE) {
                    const secs = (err.meta?.remainingSeconds as number) ?? 86400;
                    startCooldown(secs);
                    setError(`Cooldown active — ${Math.ceil(secs / 3600)}h remaining`);
                } else {
                    setError(err.message);
                }
            } else {
                setError("Analysis failed. Please try again.");
            }
        } finally {
            setAnalyzing(false);
        }
    }, [address, client, startProofPolling, stopProofPolling, startCooldown]);


    useEffect(() => {
        if (!address) {
            setScore(null);
            setProof(null);
            setOnchain(null);
            setError(null);
            setCooldownRemaining(0);
            stopProofPolling();
            return;
        }

        if (autoAnalyze) {
            analyze();
        } else {
            refetch();
        }

        return () => {
            stopProofPolling();
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, [address]);

    return { score, proof, onchain, loading, analyzing, error, cooldownRemaining, analyze, refetch };
}


/**
 * Minimal hook — just score, tier, eligibility.
 * Perfect for simple loan-gating use cases.
 *
 * @example
 * const { eligible, maxLoan, tier, analyze } = useSimpleScore(client, address);
 * if (!eligible) return <div>Not eligible to borrow</div>;
 */
export function useSimpleScore(client: CredGateClient, address: string | undefined) {
    const { score, loading, error, analyze, cooldownRemaining } = useCredGate(client, address);
    return {
        creditScore: score?.creditScore ?? null,
        tier: score?.tier ?? null,
        maxLoan: score?.loanProfile.maxLoanSizeUSD ?? 0,
        recommendedLTV: score?.loanProfile.recommendedLTV ?? 0,
        eligible: score ? score.tier !== "REJECT" && score.loanProfile.maxLoanSizeUSD > 0 : false,
        loading,
        error,
        cooldownRemaining,
        analyze,
    };
}
