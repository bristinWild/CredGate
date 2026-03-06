"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CREDIT_VAULT_ABI, CDUSD_ABI, CONTRACTS } from "@/lib/contracts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ProofStatus = {
    status: string;
    jobId?: string;
    currentAttestedBlock?: number;
    targetBlock?: number;
    blocksRemaining?: number;
    estimatedWaitSeconds?: number;
    txHash?: string;
    error?: string;
};

type ScoreData = {
    score: number;
    tier: string;
    maxLoanSizeUSD: number;
    breakdown?: Record<string, number>;
};

const PIPELINE_STEPS = [
    { label: "Analyze wallet" },
    { label: "Compute credit score" },
    { label: "Generate ZK proof" },
    { label: "Submit to CreditCoin" },
];

export default function BorrowTab() {
    const { address, isConnected } = useAccount();

    const [scoreData, setScoreData] = useState<ScoreData | null>(null);
    const [proofStatus, setProofStatus] = useState<ProofStatus | null>(null);
    const [maxProofStatus, setMaxProofStatus] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [borrowAmount, setBorrowAmount] = useState("");
    const [repayAmount, setRepayAmount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState<number | null>(null);

    const STATUS_RANK: Record<string, number> = {
        not_found: 0,
        pending: 1,
        waiting_attestation: 2,
        generating_proof: 3,
        submitting: 4,
        success: 5,
        failed: 5,
    };

    // ── On-chain reads ──────────────────────────────────────────────────────
    const { data: creditLine } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "getCreditLine",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: available } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "availableToBorrow",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 },
    });

    const { data: outstanding } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "getOutstanding",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 },
    }) as { data: [bigint, bigint, bigint] | undefined };

    const { data: cdUSDAllowance, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.CDUSD,
        abi: CDUSD_ABI,
        functionName: "allowance",
        args: address ? [address, CONTRACTS.CREDIT_VAULT] : undefined,
        query: { enabled: !!address },
    });


    const proofDone = proofStatus?.status === "success" || proofStatus?.status === "failed";
    const proofInProgress = !!proofStatus && !proofDone && proofStatus.status !== "not_found";
    const hasScore = !!scoreData;


    const { writeContract: writeBorrow, data: borrowTxHash, isPending: borrowPending } = useWriteContract();
    const { writeContract: writeRepay, data: repayTxHash, isPending: repayPending } = useWriteContract();
    const { writeContract: writeApprove, data: approveTxHash, isPending: approvePending } = useWriteContract();

    const { isLoading: borrowConfirming, isSuccess: borrowSuccess } = useWaitForTransactionReceipt({ hash: borrowTxHash });
    const { isLoading: repayConfirming, isSuccess: repaySuccess } = useWaitForTransactionReceipt({ hash: repayTxHash });
    const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });


    const pollProofStatus = useCallback(async (addr: string) => {
        try {
            const res = await fetch(`${API}/proof/status/address/${addr}`);
            const data: ProofStatus = await res.json();
            setProofStatus(data);
            setMaxProofStatus(prev => {
                const prevRank = STATUS_RANK[prev ?? 'not_found'] ?? 0;
                const newRank = STATUS_RANK[data.status] ?? 0;
                return newRank > prevRank ? data.status : prev;
            });
            return data;
        } catch {
            return null;
        }
    }, []);


    useEffect(() => {
        if (!address || !proofStatus) return;
        // Only stop polling on terminal states
        if (proofStatus.status === "success" || proofStatus.status === "failed") return;

        // Poll every 2s when active so we catch fast-moving states
        const interval = setInterval(async () => {
            const data = await pollProofStatus(address);
            if (data?.status === "success" || data?.status === "failed") clearInterval(interval);
        }, 2000);

        return () => clearInterval(interval);
    }, [address, proofStatus?.status, pollProofStatus]);


    useEffect(() => {
        if (!cooldown || cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (!prev || prev <= 1) { clearInterval(timer); return null; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);


    useEffect(() => {
        if (!address) return;
        const cached = localStorage.getItem(`credgate_score_${address.toLowerCase()}`);
        if (cached) {
            try {
                setScoreData(JSON.parse(cached));
                pollProofStatus(address);
            } catch { }
        }
    }, [address]);


    useEffect(() => {
        if (!address) { setScoreData(null); setProofStatus(null); setMaxProofStatus(null); }
    }, [address]);


    const handleAnalyze = async () => {
        if (!address) return;
        setError(null);
        setAnalyzing(true);
        setProofStatus(null);
        setMaxProofStatus(null);

        try {
            const postRes = await fetch(`/api/wallet/analyze/${address}`, { method: "POST" });
            const postData = await postRes.json();
            pollProofStatus(address);

            let result = postData;
            if (postData.status !== "DONE") {
                for (let i = 0; i < 40; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    const getRes = await fetch(`/api/wallet/result/${address}`);
                    if (!getRes.ok) continue;
                    const getData = await getRes.json();
                    if (getData.status === "DONE") { result = getData; break; }
                }
            }

            if (result.status !== "DONE") throw new Error("Analysis timed out");

            const onchain = result.result?.onchain;
            if (onchain?.status === "COOLDOWN_ACTIVE") setCooldown(onchain.remainingSeconds);

            const intelligence = result.result?.intelligence;
            if (intelligence) {
                const scorePayload = {
                    score: intelligence.creditScore ?? 0,
                    tier: intelligence.loanProfile?.interestTier ?? "REJECT",
                    maxLoanSizeUSD: intelligence.loanProfile?.maxLoanSizeUSD ?? 0,
                    breakdown: intelligence.scoreBreakdown,
                };
                setScoreData(scorePayload);
                localStorage.setItem(`credgate_score_${address.toLowerCase()}`, JSON.stringify(scorePayload));
            }

            await pollProofStatus(address);
        } catch (err: any) {
            setError(err?.message ?? "Analysis failed");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleBorrow = () => {
        if (!borrowAmount) return;
        writeBorrow({
            address: CONTRACTS.CREDIT_VAULT,
            abi: CREDIT_VAULT_ABI,
            functionName: "borrow",
            args: [parseUnits(borrowAmount, 6)],
        });
    };

    const handleApproveAndRepay = async () => {
        if (!repayAmount) return;
        const amount = parseUnits(repayAmount, 6);
        const allowance = cdUSDAllowance as bigint ?? 0n;

        if (allowance < amount) {
            writeApprove({
                address: CONTRACTS.CDUSD,
                abi: CDUSD_ABI,
                functionName: "approve",
                args: [CONTRACTS.CREDIT_VAULT, amount],
            });
        } else {
            writeRepay({
                address: CONTRACTS.CREDIT_VAULT,
                abi: CREDIT_VAULT_ABI,
                functionName: "repay",
                args: [amount],
            });
        }
    };

    useEffect(() => {
        if (approveSuccess && repayAmount) {
            writeRepay({
                address: CONTRACTS.CREDIT_VAULT,
                abi: CREDIT_VAULT_ABI,
                functionName: "repay",
                args: [parseUnits(repayAmount, 6)],
            });
            refetchAllowance();
        }
    }, [approveSuccess]);

    const proofProgress = proofStatus?.targetBlock && proofStatus?.blocksRemaining !== undefined
        ? Math.round(((proofStatus.targetBlock - proofStatus.blocksRemaining) / proofStatus.targetBlock) * 100)
        : 0;

    const formatUSDC = (val: bigint | undefined) =>
        val !== undefined ? `$${parseFloat(formatUnits(val, 6)).toFixed(2)}` : "$0.00";

    const getTierColor = (tier: string) => {
        if (tier?.includes("ELITE") || tier?.includes("PRIME")) return "#4ef2e8";
        if (tier?.includes("PREFERRED")) return "#a78bfa";
        if (tier?.includes("STANDARD")) return "#f59e0b";
        return "#6b7280";
    };


    const getPipelineStep = (index: number): "done" | "active" | "idle" => {
        const effectiveStatus = maxProofStatus ?? proofStatus?.status;
        switch (index) {
            case 0:
                if (scoreData) return "done";
                if (analyzing) return "active";
                return "idle";
            case 1:
                if (scoreData) return "done";
                if (analyzing) return "active";
                return "idle";
            case 2:
                if (effectiveStatus === "success" || effectiveStatus === "submitting") return "done";
                if (effectiveStatus === "generating_proof" || effectiveStatus === "waiting_attestation") return "active";
                if (proofInProgress) return "active";
                return "idle";
            case 3:
                if (effectiveStatus === "success") return "done";
                if (effectiveStatus === "submitting") return "active";
                return "idle";
            default:
                return "idle";
        }
    };


    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ border: "1px solid var(--color-border)", background: "rgba(78,242,232,0.04)" }}
                >
                    <span className="text-2xl">🔐</span>
                </div>
                <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
                    Connect your wallet to check your credit score
                </p>
            </div>
        );
    }


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


            <div className="lg:col-span-1 flex flex-col gap-4">


                <div
                    className="rounded-2xl p-6 flex flex-col gap-5"
                    style={{ border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}
                >
                    <div className="flex items-center justify-between">
                        <h3 style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }}>
                            CREDIT SCORE
                        </h3>
                        {scoreData && (
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    padding: "3px 10px",
                                    borderRadius: "999px",
                                    color: getTierColor(scoreData.tier),
                                    borderColor: getTierColor(scoreData.tier) + "40",
                                    background: getTierColor(scoreData.tier) + "12",
                                    border: `1px solid ${getTierColor(scoreData.tier)}40`,
                                }}
                            >
                                {scoreData.tier}
                            </span>
                        )}
                    </div>

                    {scoreData ? (
                        <div>
                            <div className="flex items-end gap-2 mb-3">
                                <span
                                    style={{
                                        fontSize: "56px",
                                        fontWeight: 800,
                                        fontFamily: "monospace",
                                        color: getTierColor(scoreData.tier),
                                        lineHeight: 1,
                                    }}
                                >
                                    {scoreData.score}
                                </span>
                                <span style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "6px" }}>/100</span>
                            </div>
                            <div
                                className="w-full overflow-hidden"
                                style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        width: `${scoreData.score}%`,
                                        borderRadius: "2px",
                                        background: `linear-gradient(90deg, #4ef2e8, ${getTierColor(scoreData.tier)})`,
                                        boxShadow: `0 0 10px ${getTierColor(scoreData.tier)}60`,
                                        transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                                    }}
                                />
                            </div>
                            {scoreData.maxLoanSizeUSD > 0 && (
                                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "8px" }}>
                                    Max loan:{" "}
                                    <span style={{ color: "#4ef2e8", fontWeight: 600 }}>
                                        ${scoreData.maxLoanSizeUSD.toLocaleString()}
                                    </span>
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-end gap-2">
                            <span
                                style={{
                                    fontSize: "56px",
                                    fontWeight: 800,
                                    fontFamily: "monospace",
                                    color: "rgba(255,255,255,0.08)",
                                    lineHeight: 1,
                                }}
                            >
                                --
                            </span>
                            <span style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "6px" }}>/100</span>
                        </div>
                    )}


                    {!hasScore ? (
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            style={{
                                width: "100%",
                                padding: "11px",
                                borderRadius: "12px",
                                fontSize: "13px",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                cursor: analyzing ? "not-allowed" : "pointer",
                                opacity: analyzing ? 0.7 : 1,
                                background: "rgba(78,242,232,0.12)",
                                border: "1px solid rgba(78,242,232,0.35)",
                                color: "#4ef2e8",
                                transition: "all 0.2s",
                            }}
                        >
                            {analyzing ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <span style={{
                                        width: "12px", height: "12px",
                                        border: "2px solid rgba(78,242,232,0.3)",
                                        borderTopColor: "#4ef2e8",
                                        borderRadius: "50%",
                                        display: "inline-block",
                                        animation: "spin 0.7s linear infinite",
                                    }} />
                                    Analyzing...
                                </span>
                            ) : "Analyze Wallet"}
                        </button>
                    ) : proofInProgress ? (
                        <button
                            disabled
                            style={{
                                width: "100%",
                                padding: "11px",
                                borderRadius: "12px",
                                fontSize: "13px",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                cursor: "not-allowed",
                                opacity: 0.6,
                                background: "rgba(78,242,232,0.06)",
                                border: "1px solid rgba(78,242,232,0.2)",
                                color: "#4ef2e8",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                <span style={{
                                    width: "12px", height: "12px",
                                    border: "2px solid rgba(78,242,232,0.3)",
                                    borderTopColor: "#4ef2e8",
                                    borderRadius: "50%",
                                    display: "inline-block",
                                    animation: "spin 0.7s linear infinite",
                                }} />
                                View Proof Status
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing || !!cooldown}
                            style={{
                                width: "100%",
                                padding: "11px",
                                borderRadius: "12px",
                                fontSize: "13px",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                                cursor: analyzing || cooldown ? "not-allowed" : "pointer",
                                opacity: analyzing || cooldown ? 0.6 : 1,
                                background: cooldown ? "rgba(245,158,11,0.08)" : "rgba(78,242,232,0.12)",
                                border: `1px solid ${cooldown ? "rgba(245,158,11,0.3)" : "rgba(78,242,232,0.35)"}`,
                                color: cooldown ? "#f59e0b" : "#4ef2e8",
                                transition: "all 0.2s",
                            }}
                        >
                            {analyzing ? (
                                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                    <span style={{
                                        width: "12px", height: "12px",
                                        border: "2px solid rgba(78,242,232,0.3)",
                                        borderTopColor: "#4ef2e8",
                                        borderRadius: "50%",
                                        display: "inline-block",
                                        animation: "spin 0.7s linear infinite",
                                    }} />
                                    Analyzing...
                                </span>
                            ) : cooldown ? `Cooldown: ${cooldown}s` : "Re-analyze"}
                        </button>
                    )}


                    <div
                        style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: "12px" }}>
                            VERIFICATION PIPELINE
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {PIPELINE_STEPS.map((step, i) => {
                                const state = getPipelineStep(i);
                                return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>

                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

                                            <div style={{
                                                width: "20px",
                                                height: "20px",
                                                borderRadius: "50%",
                                                flexShrink: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                transition: "all 0.4s ease",
                                                background: state === "done"
                                                    ? "#4ef2e8"
                                                    : state === "active"
                                                        ? "rgba(78,242,232,0.15)"
                                                        : "rgba(255,255,255,0.04)",
                                                border: state === "done"
                                                    ? "2px solid #4ef2e8"
                                                    : state === "active"
                                                        ? "2px solid #4ef2e8"
                                                        : "2px solid rgba(255,255,255,0.1)",
                                                boxShadow: state === "active" ? "0 0 10px rgba(78,242,232,0.4)" : "none",
                                                animation: state === "active" ? "subtlePulse 2s ease-in-out infinite" : "none",
                                            }}>
                                                {state === "done" ? (
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                        <path d="M2 5l2.5 2.5 3.5-4" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                ) : state === "active" ? (
                                                    <div style={{
                                                        width: "6px", height: "6px",
                                                        borderRadius: "50%",
                                                        background: "#4ef2e8",
                                                        animation: "ping 1.2s ease-out infinite",
                                                    }} />
                                                ) : (
                                                    <div style={{
                                                        width: "6px", height: "6px",
                                                        borderRadius: "50%",
                                                        background: "rgba(255,255,255,0.15)",
                                                    }} />
                                                )}
                                            </div>
                                        </div>


                                        <span style={{
                                            fontSize: "12px",
                                            fontWeight: state === "active" ? 600 : 400,
                                            color: state === "done"
                                                ? "#4ef2e8"
                                                : state === "active"
                                                    ? "rgba(255,255,255,0.9)"
                                                    : "rgba(255,255,255,0.25)",
                                            transition: "all 0.3s ease",
                                            flex: 1,
                                        }}>
                                            {step.label}
                                        </span>


                                        {state === "done" && (
                                            <span style={{
                                                fontSize: "9px",
                                                fontWeight: 700,
                                                letterSpacing: "0.06em",
                                                color: "#4ef2e8",
                                                opacity: 0.7,
                                            }}>
                                                DONE
                                            </span>
                                        )}
                                        {state === "active" && (
                                            <span style={{
                                                fontSize: "9px",
                                                fontWeight: 700,
                                                letterSpacing: "0.06em",
                                                color: "#f59e0b",
                                            }}>
                                                LIVE
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <p style={{ fontSize: "12px", color: "#f87171", textAlign: "center" }}>{error}</p>
                    )}
                </div>

                {proofStatus && proofStatus.status !== "not_found" && (
                    <div
                        className="rounded-2xl p-6"
                        style={{
                            border: proofStatus.status === "success"
                                ? "1px solid rgba(74,222,128,0.25)"
                                : proofStatus.status === "failed"
                                    ? "1px solid rgba(248,113,113,0.25)"
                                    : "1px solid var(--color-border)",
                            background: proofStatus.status === "success"
                                ? "rgba(74,222,128,0.04)"
                                : proofStatus.status === "failed"
                                    ? "rgba(248,113,113,0.04)"
                                    : "rgba(255,255,255,0.02)",
                        }}
                    >
                        <h3 style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "14px" }}>
                            ON-CHAIN VERIFICATION
                        </h3>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                            <div style={{
                                width: "8px", height: "8px", borderRadius: "50%",
                                flexShrink: 0,
                                background: proofStatus.status === "success"
                                    ? "#4ade80"
                                    : proofStatus.status === "failed"
                                        ? "#f87171"
                                        : "#4ef2e8",
                                boxShadow: proofStatus.status === "success"
                                    ? "0 0 8px #4ade80"
                                    : proofStatus.status === "failed"
                                        ? "none"
                                        : "0 0 8px #4ef2e8",
                                animation: proofInProgress ? "subtlePulse 1.5s ease-in-out infinite" : "none",
                            }} />
                            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>
                                {proofStatus.status === "waiting_attestation" ? "Waiting for attestation"
                                    : proofStatus.status === "generating_proof" ? "Generating ZK proof"
                                        : proofStatus.status === "submitting" ? "Submitting to CreditCoin"
                                            : proofStatus.status === "success" ? "Verified on-chain ✓"
                                                : proofStatus.status === "failed" ? "Verification failed"
                                                    : proofStatus.status.replace(/_/g, " ")}
                            </span>
                        </div>

                        {proofStatus.status === "waiting_attestation" && proofStatus.targetBlock && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{
                                    width: "100%", height: "4px", borderRadius: "2px",
                                    background: "rgba(255,255,255,0.06)", overflow: "hidden",
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${proofProgress}%`,
                                        borderRadius: "2px",
                                        background: "linear-gradient(90deg, #4ef2e8, #818cf8)",
                                        boxShadow: "0 0 8px rgba(78,242,232,0.5)",
                                        transition: "width 0.8s ease",
                                    }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                                        Block {proofStatus.currentAttestedBlock?.toLocaleString()}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                                        {proofStatus.blocksRemaining} blocks left
                                    </span>
                                </div>
                                {proofStatus.estimatedWaitSeconds && (
                                    <p style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                                        ~{Math.ceil(proofStatus.estimatedWaitSeconds / 60)} min remaining
                                    </p>
                                )}
                            </div>
                        )}

                        {proofStatus.status === "success" && proofStatus.txHash && (
                            <p style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "monospace", marginTop: "4px" }}>
                                tx: {proofStatus.txHash.slice(0, 22)}...
                            </p>
                        )}

                        {proofStatus.status === "failed" && (
                            <p style={{ fontSize: "11px", color: "rgba(248,113,113,0.7)", marginTop: "4px" }}>
                                Proof submission failed. Re-analyze to retry.
                            </p>
                        )}
                    </div>
                )}
            </div>


            <div className="lg:col-span-2 flex flex-col gap-4">


                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Credit Line", value: formatUSDC(creditLine as bigint), sub: "max borrowable", highlight: false },
                        { label: "Available", value: formatUSDC(available as bigint), sub: "ready to draw", highlight: true },
                        { label: "Outstanding", value: formatUSDC(outstanding?.[2]), sub: "principal + interest", highlight: false },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl p-5"
                            style={{
                                border: item.highlight ? "1px solid rgba(78,242,232,0.3)" : "1px solid var(--color-border)",
                                background: item.highlight ? "rgba(78,242,232,0.04)" : "rgba(255,255,255,0.02)",
                            }}
                        >
                            <p style={{ fontSize: "11px", color: "var(--color-muted)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                                {item.label}
                            </p>
                            <p style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                color: item.highlight ? "#4ef2e8" : "white",
                            }}>
                                {item.value}
                            </p>
                            <p style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "4px" }}>{item.sub}</p>
                        </div>
                    ))}
                </div>

                <div
                    className="rounded-2xl p-6"
                    style={{ border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>Borrow cdUSD</h3>
                        <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>10% APR · No collateral</span>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: 1, position: "relative" }}>
                            <input
                                type="number"
                                value={borrowAmount}
                                onChange={(e) => setBorrowAmount(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    width: "100%",
                                    padding: "12px 52px 12px 16px",
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "12px",
                                    color: "white",
                                    fontSize: "14px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                            <span style={{
                                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                                fontSize: "11px", color: "var(--color-muted)",
                            }}>
                                cdUSD
                            </span>
                        </div>
                        <button
                            onClick={handleBorrow}
                            disabled={!borrowAmount || borrowPending || borrowConfirming || !available || (available as bigint) === 0n}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "12px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: !borrowAmount || (available as bigint) === 0n ? "not-allowed" : "pointer",
                                opacity: !borrowAmount || (available as bigint) === 0n ? 0.4 : 1,
                                background: "rgba(78,242,232,0.12)",
                                border: "1px solid rgba(78,242,232,0.35)",
                                color: "#4ef2e8",
                                flexShrink: 0,
                                transition: "all 0.2s",
                            }}
                        >
                            {borrowPending || borrowConfirming ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{
                                        width: "12px", height: "12px",
                                        border: "2px solid rgba(78,242,232,0.3)", borderTopColor: "#4ef2e8",
                                        borderRadius: "50%", display: "inline-block",
                                        animation: "spin 0.7s linear infinite",
                                    }} />
                                    {borrowConfirming ? "Confirming..." : "Signing..."}
                                </span>
                            ) : "Borrow"}
                        </button>
                    </div>

                    {available !== undefined && (available as bigint) === 0n && (
                        <p style={{ marginTop: "10px", fontSize: "12px", color: "#f59e0b" }}>
                            {creditLine !== undefined && (creditLine as bigint) === 0n
                                ? "Your credit score is too low to borrow. Analyze your wallet first."
                                : "You've used your full credit line. Repay to borrow more."}
                        </p>
                    )}
                    {borrowSuccess && (
                        <p style={{ marginTop: "10px", fontSize: "12px", color: "#4ade80" }}>✓ Borrowed successfully!</p>
                    )}

                    {available !== undefined && (available as bigint) > 0n && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        const amt = (parseFloat(formatUnits(available as bigint, 6)) * pct) / 100;
                                        setBorrowAmount(amt.toFixed(2));
                                    }}
                                    style={{
                                        fontSize: "11px",
                                        padding: "5px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--color-border)",
                                        color: "var(--color-muted)",
                                        background: "transparent",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.color = "white";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(78,242,232,0.3)";
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)";
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
                                    }}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    )}
                </div>


                {outstanding && outstanding[2] > 0n && (
                    <div
                        className="rounded-2xl p-6"
                        style={{ border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "white" }}>Repay Loan</h3>
                            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--color-muted)" }}>
                                <span>Principal: {formatUSDC(outstanding[0])}</span>
                                <span>Interest: {formatUSDC(outstanding[1])}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{ flex: 1, position: "relative" }}>
                                <input
                                    type="number"
                                    value={repayAmount}
                                    onChange={(e) => setRepayAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{
                                        width: "100%",
                                        padding: "12px 52px 12px 16px",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "12px",
                                        color: "white",
                                        fontSize: "14px",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                                <span style={{
                                    position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                                    fontSize: "11px", color: "var(--color-muted)",
                                }}>
                                    cdUSD
                                </span>
                            </div>
                            <button
                                onClick={handleApproveAndRepay}
                                disabled={!repayAmount || repayPending || repayConfirming || approvePending || approveConfirming}
                                style={{
                                    padding: "12px 24px",
                                    borderRadius: "12px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: !repayAmount ? "not-allowed" : "pointer",
                                    opacity: !repayAmount ? 0.4 : 1,
                                    background: "rgba(168,85,247,0.12)",
                                    border: "1px solid rgba(168,85,247,0.35)",
                                    color: "#a855f7",
                                    flexShrink: 0,
                                    transition: "all 0.2s",
                                }}
                            >
                                {approvePending || approveConfirming ? "Approving..."
                                    : repayPending || repayConfirming ? "Repaying..."
                                        : (cdUSDAllowance as bigint ?? 0n) < parseUnits(repayAmount || "0", 6)
                                            ? "Approve & Repay"
                                            : "Repay"}
                            </button>
                        </div>

                        <button
                            onClick={() => setRepayAmount(formatUnits(outstanding[2], 6))}
                            style={{
                                marginTop: "10px",
                                fontSize: "12px",
                                color: "var(--color-muted)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                transition: "color 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "white"}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--color-muted)"}
                        >
                            Repay full: {formatUSDC(outstanding[2])}
                        </button>

                        {repaySuccess && (
                            <p style={{ marginTop: "10px", fontSize: "12px", color: "#4ade80" }}>✓ Repaid successfully!</p>
                        )}
                    </div>
                )}
            </div>


            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes subtlePulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes ping {
                    0% { transform: scale(1); opacity: 1; }
                    75%, 100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}