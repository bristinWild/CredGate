"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCredGate = useCredGate;
exports.useSimpleScore = useSimpleScore;
const react_1 = require("react");
const types_1 = require("../types");
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
function useCredGate(client, address, options = {}) {
    const { autoAnalyze = false, proofPollInterval = 5000 } = options;
    const [score, setScore] = (0, react_1.useState)(null);
    const [proof, setProof] = (0, react_1.useState)(null);
    const [onchain, setOnchain] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [analyzing, setAnalyzing] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [cooldownRemaining, setCooldownRemaining] = (0, react_1.useState)(0);
    const proofPollRef = (0, react_1.useRef)(null);
    const cooldownRef = (0, react_1.useRef)(null);
    const stopProofPolling = (0, react_1.useCallback)(() => {
        if (proofPollRef.current) {
            clearInterval(proofPollRef.current);
            proofPollRef.current = null;
        }
    }, []);
    const startProofPolling = (0, react_1.useCallback)((addr) => {
        if (!proofPollInterval || proofPollRef.current)
            return;
        proofPollRef.current = setInterval(async () => {
            try {
                const p = await client.getProofStatus(addr);
                setProof(p);
                if (p.status === "success" || p.status === "failed" || p.status === "not_found") {
                    stopProofPolling();
                }
            }
            catch {
            }
        }, proofPollInterval);
    }, [client, proofPollInterval, stopProofPolling]);
    const startCooldown = (0, react_1.useCallback)((seconds) => {
        setCooldownRemaining(seconds);
        if (cooldownRef.current)
            clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setCooldownRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);
    const refetch = (0, react_1.useCallback)(async () => {
        if (!address)
            return;
        setLoading(true);
        setError(null);
        try {
            const [scoreRes, proofRes, onchainRes] = await Promise.allSettled([
                client.getScore(address),
                client.getProofStatus(address),
                client.getOnChainStatus(address),
            ]);
            if (scoreRes.status === "fulfilled")
                setScore(scoreRes.value);
            if (proofRes.status === "fulfilled")
                setProof(proofRes.value);
            if (onchainRes.status === "fulfilled")
                setOnchain(onchainRes.value);
            if (proofRes.status === "fulfilled" &&
                proofRes.value.status !== "success" &&
                proofRes.value.status !== "failed" &&
                proofRes.value.status !== "not_found") {
                startProofPolling(address);
            }
        }
        finally {
            setLoading(false);
        }
    }, [address, client, startProofPolling]);
    const analyze = (0, react_1.useCallback)(async () => {
        if (!address)
            return;
        setAnalyzing(true);
        setError(null);
        setProof(null);
        stopProofPolling();
        try {
            const result = await client.analyzeWallet(address);
            setScore(result.score);
            setOnchain(result.onchain);
            if (result.proof)
                setProof(result.proof);
            startProofPolling(address);
        }
        catch (err) {
            if (err instanceof types_1.CredGateError) {
                if (err.code === types_1.ErrorCode.COOLDOWN_ACTIVE) {
                    const secs = err.meta?.remainingSeconds ?? 86400;
                    startCooldown(secs);
                    setError(`Cooldown active — ${Math.ceil(secs / 3600)}h remaining`);
                }
                else {
                    setError(err.message);
                }
            }
            else {
                setError("Analysis failed. Please try again.");
            }
        }
        finally {
            setAnalyzing(false);
        }
    }, [address, client, startProofPolling, stopProofPolling, startCooldown]);
    (0, react_1.useEffect)(() => {
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
        }
        else {
            refetch();
        }
        return () => {
            stopProofPolling();
            if (cooldownRef.current)
                clearInterval(cooldownRef.current);
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
function useSimpleScore(client, address) {
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
//# sourceMappingURL=hooks.js.map