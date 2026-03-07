"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/app/components/Navbar/Navbar";

import ExecutiveSummary from "@/app/dashboard/components/ExecutiveSummary/ExecutiveSummary";
import CreditScoreBreakdown from "@/app/dashboard/components/CreditScoreBreakdown/CreditScoreBreakdown";
import RiskEngineAnalysis from "@/app/dashboard/components/RiskEngineAnalysis/RiskEngineAnalysis";
import StableTreasuryIntelligence from "@/app/dashboard/components/StableTreasuryIntelligence/StableTreasuryIntelligence";
import DexBehaviorIntelligence from "@/app/dashboard/components/DexBehaviorIntelligence/DexBehaviorIntelligence";
import CrossChainIntelligence from "@/app/dashboard/components/CrossChainIntelligence/CrossChainIntelligence";
import LendingHistoryCard from "@/app/dashboard/components/LendingHistoryCard/LendingHistoryCard";
import LoanDecisionCard from "@/app/dashboard/components/LoanDecisionCard/LoanDecisionCard";
import OnChainStatusCard from "@/app/dashboard/components/OnChainStatusCard/Onchainstatuscard";
import { useAccount } from "wagmi";



type AnalysisStatus = "IDLE" | "PROCESSING" | "DONE" | "ERROR";

interface WalletResult {
    address: string;
    basic: { ethBalance: string; txCount: number; walletAgeBlocks: number };
    aave: { borrows: unknown[]; repays: unknown[]; liquidations: unknown[] };
    meta: { analyzedAt: number };
    intelligence: {
        metrics: {
            totalBorrows: number; totalRepays: number; totalLiquidations: number;
            repayRatio: number; liquidationRate: number; borrowRepayCycles: number;
        };
        risk: { riskScore: number; riskLevel: "LOW" | "MEDIUM" | "HIGH" };
        creditScore: number;
        scoreBreakdown: {
            lending: number; stable: number; crossChain: number;
            dex: number; ageBonus: number; riskPenalty: number;
        };
        stable: {
            totalInflow: number; totalOutflow: number; netFlow: number;
            retentionRatio: number; activeMonths: number;
            largestInflowSourceShare: number; stableScore: number; stableLevel: string;
        };
        crossChain: {
            chainsUsedCount: number; activeChains: string[]; totalTxAcrossChains: number;
            chainDetails: { chain: string; txCount: number; firstTxBlock: number | null; walletAgeDays: number | null }[];
            crossChainMaturityScore: number; crossChainRiskImpact: number;
        };
        dex: {
            totalSwaps: number; totalVolumeUSD: number; uniqueTokensTraded: number;
            avgSwapSizeUSD: number; swapFrequencyPerMonth: number;
            dexMaturityScore: number; dexRiskImpact: number;
        };
        loanProfile: { recommendedLTV: number; interestTier: string; maxLoanSizeUSD: number };
    };
    onchain: { status: string; txHash: string; reportHash: string; remainingSeconds: number };
}

//useWalletAnalysis 

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 120000;

function useWalletAnalysis() {
    const [status, setStatus] = useState<AnalysisStatus>("IDLE");
    const [data, setData] = useState<WalletResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);


    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedAt = useRef<number>(0);


    const clearTimers = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        pollRef.current = null;
        timeoutRef.current = null;
    }, []);

    const reset = useCallback(() => {
        clearTimers();
        setStatus("IDLE");
        setData(null);
        setError(null);
        setProgress(0);
    }, [clearTimers]);



    useEffect(() => () => clearTimers(), [clearTimers]);



    const pollResult = useCallback(async (address: string) => {
        try {
            const res = await fetch(`${API_BASE}/wallet/result/${address}`);
            if (!res.ok) throw new Error(`Result fetch failed: ${res.status}`);
            const json = await res.json();

            if (json.status === "PROCESSING") {
                const elapsed = Date.now() - startedAt.current;
                const naturalPct = Math.min((elapsed / POLL_TIMEOUT) * 80, 80);
                setProgress(prev => Math.max(prev + 2, naturalPct));
                return;
            }
            if (json.status === "DONE" && json.result) {
                clearTimers();
                setData(json.result as WalletResult);
                setStatus("DONE");
                setProgress(100);
                return;
            }
            throw new Error("Unexpected response shape from /wallet/result");
        } catch (err) {
            clearTimers();
            setError(err instanceof Error ? err.message : "Unknown error");
            setStatus("ERROR");
        }
    }, [clearTimers]);

    const analyze = useCallback(async (address: string) => {
        if (!address.trim()) return;
        clearTimers();
        setStatus("PROCESSING");
        setData(null);
        setError(null);
        setProgress(5);
        startedAt.current = Date.now();

        try {
            const initRes = await fetch(`${API_BASE}/wallet/analyze/${address}`, {
                method: "POST",
            });
            if (!initRes.ok) throw new Error(`Analyze request failed: ${initRes.status}`);
            setProgress(10);
            pollRef.current = setInterval(() => pollResult(address), POLL_INTERVAL);
            timeoutRef.current = setTimeout(() => {
                clearTimers();
                setError("Analysis timed out after 2 minutes. Please try again.");
                setStatus("ERROR");
            }, POLL_TIMEOUT);
        } catch (err) {
            clearTimers();
            setError(err instanceof Error ? err.message : "Failed to start analysis");
            setStatus("ERROR");
        }
    }, [clearTimers, pollResult]);
    const checkExisting = useCallback(async (address: string) => {
        if (!address.trim()) return;
        setStatus("PROCESSING");
        setProgress(50);
        try {
            const res = await fetch(`${API_BASE}/wallet/result/${address}`);
            if (!res.ok) throw new Error("No cached result");
            const json = await res.json();
            if (json.status === "DONE" && json.result) {
                setData(json.result as WalletResult);
                setStatus("DONE");
                setProgress(100);
            } else {
                // No cached result, go back to idle
                setStatus("IDLE");
                setProgress(0);
            }
        } catch {
            setStatus("IDLE");
            setProgress(0);
        }
    }, []);

    return { status, data, error, progress, analyze, reset, checkExisting };

}

//  Helpers

function walletAgeDays(blocks: number) {
    return Math.round((blocks / 7200) * 100) / 100;
}
function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function isValidAddress(addr: string) {
    return /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
}

// Skeleton

function SkeletonCard({ height = 200 }: { height?: number }) {
    return (
        <div style={{ height, borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)", animation: "shimmer 1.8s infinite" }} />
            <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        </div>
    );
}

function LoadingSkeleton({ progress, message }: { progress: number; message: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px" }}>
            <div style={{ padding: "16px 20px", borderRadius: "12px", background: "rgba(78,242,232,0.05)", border: "1px solid rgba(78,242,232,0.15)", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "2px solid rgba(78,242,232,0.2)", borderTopColor: "#4ef2e8", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "12px", color: "#4ef2e8", fontWeight: 600, margin: 0 }}>{message}</p>
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #4ef2e8, #818cf8)", borderRadius: "2px", transition: "width 0.8s ease", boxShadow: "0 0 8px rgba(78,242,232,0.5)" }} />
                    </div>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#4ef2e8", fontFamily: "monospace", flexShrink: 0 }}>{progress}%</span>
            </div>
            <SkeletonCard height={180} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <SkeletonCard height={340} /><SkeletonCard height={340} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <SkeletonCard height={300} /><SkeletonCard height={300} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <SkeletonCard height={480} /><SkeletonCard height={480} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <SkeletonCard height={380} /><SkeletonCard height={320} />
            </div>
        </div>
    );
}

//  NoWalletHero

function NoWalletHero() {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "20px", textAlign: "center" }}>
            <div style={{ position: "relative", marginBottom: "8px" }}>
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "rgba(78,242,232,0.04)", border: "1px solid rgba(78,242,232,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>🔗</div>
                <div style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: "1px dashed rgba(78,242,232,0.12)", animation: "rotateSlow 12s linear infinite" }} />
                <style>{`@keyframes rotateSlow{to{transform:rotate(360deg)}}`}</style>
            </div>
            <div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: "0 0 8px" }}>Connect Your Wallet First</h2>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", maxWidth: "380px", lineHeight: 1.7, margin: 0 }}>Connect your wallet from the navbar to analyse your on-chain credit profile.</p>
            </div>
        </div>
    );
}

//  AnalyseCTA 

function AnalyseCTA({ address, onAnalyse }: { address: string; onAnalyse: () => void }) {
    const C = 2 * Math.PI * 58;
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: "24px", textAlign: "center" }}>
            <div style={{ position: "relative" }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                    <defs>
                        <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4ef2e8" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#d946ef" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>
                    <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(78,242,232,0.1)" strokeWidth="1" strokeDasharray="4 6" style={{ animation: "rotateSlow 20s linear infinite", transformOrigin: "center" }} />
                    <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                    <circle cx="80" cy="80" r="58" fill="none" stroke="url(#ctaGrad)" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${C * 0.6} ${C}`} transform="rotate(-90 80 80)"
                        style={{ animation: "arcPulse 3s ease-in-out infinite" }}
                    />
                    <style>{`@keyframes arcPulse{0%,100%{opacity:.4;stroke-dasharray:${C * 0.4} ${C}}50%{opacity:1;stroke-dasharray:${C * 0.75} ${C}}}`}</style>
                    <text x="80" y="72" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="28" fontWeight="800">?</text>
                    <text x="80" y="92" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="11" letterSpacing="1">CREDIT SCORE</text>
                </svg>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ef2e8", boxShadow: "0 0 6px #4ef2e8" }} />
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>{shortAddress(address)}</span>
            </div>

            <div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: "0 0 8px" }}>Your Credit Profile Awaits</h2>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", maxWidth: "400px", lineHeight: 1.7, margin: 0 }}>
                    We'll analyse your on-chain activity across Aave, DEX, stables and cross-chain and compute your credit score — registered on Sepolia.
                </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", maxWidth: "500px" }}>
                {["🏦 Aave History", "🔄 DEX Behaviour", "💵 Stable Treasury", "🌐 Cross-Chain", "📊 Risk Profile"].map(tag => (
                    <span key={tag} style={{ fontSize: "11px", padding: "4px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>{tag}</span>
                ))}
            </div>

            <button
                onClick={onAnalyse}
                style={{ marginTop: "8px", padding: "14px 40px", borderRadius: "12px", background: "linear-gradient(135deg, rgba(78,242,232,0.15), rgba(129,140,248,0.15))", border: "1px solid rgba(78,242,232,0.35)", color: "#4ef2e8", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", boxShadow: "0 0 30px rgba(78,242,232,0.1)", transition: "all 0.2s ease" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 40px rgba(78,242,232,0.25)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(78,242,232,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(78,242,232,0.1)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(78,242,232,0.35)"; }}
            >
                ANALYSE YOUR SCORE
            </button>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}>TAKES 30 – 90 SECONDS · SCORE REGISTERED ON SEPOLIA</p>
        </div>
    );
}

//RefreshScoreBar 

function RefreshScoreBar({ address, onRecheck, cooldownRemaining }: { address: string; onRecheck: () => void; cooldownRemaining: number }) {
    const [timeLeft, setTimeLeft] = useState(cooldownRemaining);
    const isCooldown = timeLeft > 0;

    useEffect(() => {
        if (!isCooldown) return;
        const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [isCooldown]);

    const h = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");

    return (
        <div style={{ margin: "20px 0 32px", padding: "20px 28px", borderRadius: "14px", background: isCooldown ? "rgba(255,255,255,0.02)" : "rgba(78,242,232,0.04)", border: `1px solid ${isCooldown ? "rgba(255,255,255,0.07)" : "rgba(78,242,232,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
            <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: "4px" }}>{isCooldown ? "NEXT ANALYSIS AVAILABLE IN" : "READY FOR NEW ANALYSIS"}</p>
                {isCooldown
                    ? <p style={{ fontSize: "24px", fontWeight: 800, fontFamily: "monospace", color: "#f59e0b", lineHeight: 1 }}>{h}:{m}:{s}</p>
                    : <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Score data can be refreshed once every 24 hours.</p>
                }
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ef2e8", boxShadow: "0 0 5px #4ef2e8" }} />
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{shortAddress(address)}</span>
                </div>
                <button
                    onClick={onRecheck} disabled={isCooldown}
                    style={{ padding: "10px 24px", borderRadius: "10px", background: isCooldown ? "rgba(255,255,255,0.03)" : "rgba(78,242,232,0.1)", border: `1px solid ${isCooldown ? "rgba(255,255,255,0.07)" : "rgba(78,242,232,0.3)"}`, color: isCooldown ? "rgba(255,255,255,0.2)" : "#4ef2e8", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: isCooldown ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={e => { if (!isCooldown) (e.currentTarget as HTMLButtonElement).style.background = "rgba(78,242,232,0.18)"; }}
                    onMouseLeave={e => { if (!isCooldown) (e.currentTarget as HTMLButtonElement).style.background = "rgba(78,242,232,0.1)"; }}
                >
                    {isCooldown ? "⏳ ON COOLDOWN" : "CHECK NEW SCORE"}
                </button>
            </div>
        </div>
    );
}

// DevBar (DEV only — hidden in production)

function DevBar({ devAddress, setDevAddress, onAnalyse, onClear }: {
    devAddress: string;
    setDevAddress: (v: string) => void;
    onAnalyse: () => void;
    onClear: () => void;
}) {
    const valid = isValidAddress(devAddress);

    return (
        <div style={{
            padding: "10px 24px",
            background: "rgba(245,158,11,0.06)",
            borderBottom: "1px solid rgba(245,158,11,0.15)",
            display: "flex", alignItems: "center", gap: "12px",
        }}>
            <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0 }}>
                🛠 DEV MODE
            </span>
            <input
                type="text"
                placeholder="Paste any 0x address to analyse without connecting wallet…"
                value={devAddress}
                onChange={e => setDevAddress(e.target.value)}
                style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${valid ? "rgba(78,242,232,0.3)" : devAddress ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.2)"}`,
                    borderRadius: "8px",
                    padding: "6px 12px",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    outline: "none",
                }}
            />
            {devAddress && (
                <>
                    {valid && (
                        <button
                            onClick={onAnalyse}
                            style={{
                                padding: "6px 16px", borderRadius: "6px",
                                background: "rgba(78,242,232,0.1)",
                                border: "1px solid rgba(78,242,232,0.3)",
                                color: "#4ef2e8", fontSize: "10px", fontWeight: 700,
                                letterSpacing: "0.08em", cursor: "pointer", flexShrink: 0,
                            }}
                        >
                            ANALYSE
                        </button>
                    )}
                    <button
                        onClick={onClear}
                        style={{
                            fontSize: "10px", color: "rgba(255,255,255,0.3)",
                            background: "none", border: "none", cursor: "pointer", flexShrink: 0,
                        }}
                    >
                        CLEAR
                    </button>
                </>
            )}
            {!devAddress && (
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                    e.g. 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
                </span>
            )}
        </div>
    );
}

export default function DashboardPage() {

    const { address: connectedAddress } = useAccount();


    const [devAddress, setDevAddress] = useState<string>("");
    const isDev = process.env.NODE_ENV === "development";


    const activeAddress: string | undefined =
        isDev && isValidAddress(devAddress)
            ? devAddress.trim()
            : connectedAddress;

    //Analysis hook 
    const { status, data, error, progress, analyze, reset, checkExisting } = useWalletAnalysis();

    // Reset analysis when the active address disappears
    useEffect(() => {
        if (!activeAddress) reset();
    }, [activeAddress, reset]);

    useEffect(() => {
        if (activeAddress && status === "IDLE") {
            checkExisting(activeAddress);
        }
    }, [activeAddress]);

    // Also reset if connected wallet disconnects (production safety)
    useEffect(() => {
        if (!connectedAddress && !devAddress) reset();
    }, [connectedAddress, devAddress, reset]);

    const ethPrice = 2800;
    const cooldownRemaining = data?.onchain?.remainingSeconds ?? 0;

    // Handlers

    // Primary: connected wallet
    const handleAnalyse = () => {
        if (activeAddress) analyze(activeAddress);
    };

    // Primary: re-check connected wallet
    const handleRecheck = () => {
        if (!activeAddress) return;
        reset();
        setTimeout(() => analyze(activeAddress), 100);
    };

    // Dev: analyse whatever is in the dev input
    const handleDevAnalyse = () => {
        if (!isValidAddress(devAddress)) return;
        reset();
        setTimeout(() => analyze(devAddress.trim()), 100);
    };

    // Dev: clear dev address → reverts to connected wallet
    const handleDevClear = () => {
        setDevAddress("");
        reset();
    };

    const MESSAGES = [
        "Fetching on-chain data…",
        "Analysing Aave positions…",
        "Computing DEX behaviour…",
        "Scoring cross-chain activity…",
        "Building credit profile…",
        "Registering on Sepolia…",
    ];

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />

            {/*  DEV BAR: only visible in development  */}
            {isDev && (
                <DevBar
                    devAddress={devAddress}
                    setDevAddress={v => { setDevAddress(v); if (!v) reset(); }}
                    onAnalyse={handleDevAnalyse}
                    onClear={handleDevClear}
                />
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

                {/* State 1: No wallet connected AND no dev address  */}
                {!activeAddress && <NoWalletHero />}

                {/*  State 2: Have address but haven't analysed yet  */}
                {activeAddress && status === "IDLE" && (
                    <AnalyseCTA address={activeAddress} onAnalyse={handleAnalyse} />
                )}

                {/*  State 3: Analysis in progress */}
                {activeAddress && status === "PROCESSING" && (
                    <LoadingSkeleton
                        progress={progress}
                        message={MESSAGES[Math.min(Math.floor((progress / 100) * MESSAGES.length), MESSAGES.length - 1)]}
                    />
                )}

                {/* ── State 4: Error ── */}
                {activeAddress && status === "ERROR" && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "60px 24px", textAlign: "center" }}>
                        <span style={{ fontSize: "40px" }}>⚠️</span>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444", margin: 0 }}>Analysis Failed</h3>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", maxWidth: "360px", lineHeight: 1.7, margin: 0 }}>
                            {error ?? "Something went wrong. Please try again."}
                        </p>
                        <button
                            onClick={handleAnalyse}
                            style={{ marginTop: "8px", padding: "10px 28px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer" }}
                        >
                            RETRY ANALYSIS
                        </button>
                    </div>
                )}

                {/*  State 5: Done — render dashboard  */}
                {activeAddress && status === "DONE" && data && (() => {
                    const { basic, intelligence } = data;
                    const ageDays = walletAgeDays(basic.walletAgeBlocks);
                    const collateralUSD = Math.round(parseFloat(basic.ethBalance) * ethPrice);

                    return (
                        <main style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1600px", margin: "0 auto", width: "100%" }}>

                            {/* Dev mode banner — reminds user they're viewing a demo wallet */}
                            {isDev && isValidAddress(devAddress) && (
                                <div style={{
                                    padding: "10px 16px", borderRadius: "10px",
                                    background: "rgba(245,158,11,0.06)",
                                    border: "1px solid rgba(245,158,11,0.2)",
                                    display: "flex", alignItems: "center", gap: "10px",
                                }}>
                                    <span style={{ fontSize: "12px" }}>🛠</span>
                                    <span style={{ fontSize: "11px", color: "rgba(245,158,11,0.8)" }}>
                                        Viewing demo wallet: <span style={{ fontFamily: "monospace", color: "#f59e0b" }}>{devAddress.trim()}</span>
                                        {connectedAddress && (
                                            <span style={{ color: "rgba(255,255,255,0.3)" }}>
                                                {" "}· Your connected wallet ({shortAddress(connectedAddress)}) analysis is separate
                                            </span>
                                        )}
                                    </span>
                                    <button
                                        onClick={handleDevClear}
                                        style={{ marginLeft: "auto", fontSize: "10px", color: "#f59e0b", background: "none", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "4px", padding: "3px 10px", cursor: "pointer" }}
                                    >
                                        EXIT DEMO
                                    </button>
                                </div>
                            )}

                            <ExecutiveSummary
                                walletAddress={data.address}
                                ethBalance={parseFloat(basic.ethBalance).toFixed(4)}
                                totalTransactions={basic.txCount}
                                walletAgeDays={ageDays}
                                creditScore={intelligence.creditScore}
                                maxCreditScore={100}
                                riskLevel={intelligence.risk.riskLevel}
                                recommendedLTV={intelligence.loanProfile.recommendedLTV}
                                interestTier={intelligence.loanProfile.interestTier}
                                maxLoanSizeUSD={intelligence.loanProfile.maxLoanSizeUSD}
                            />

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <CreditScoreBreakdown
                                    creditScore={intelligence.creditScore}
                                    maxScore={100}
                                    breakdown={intelligence.scoreBreakdown}
                                />
                                <RiskEngineAnalysis
                                    finalRisk={intelligence.risk.riskScore}
                                    baseRisk={30}
                                    dexRiskImpact={intelligence.dex.dexRiskImpact}
                                    burstPenalty={intelligence.dex.dexRiskImpact > 10 ? 15 : 5}
                                    stableMitigation={Math.round(intelligence.stable.stableScore / 10)}
                                    crossChainImpact={Math.abs(intelligence.crossChain.crossChainRiskImpact)}
                                    alerts={[
                                        ...(intelligence.dex.swapFrequencyPerMonth > 100
                                            ? [{ icon: "⚠", text: "High-frequency DEX activity detected", severity: "warn" as const }]
                                            : []),
                                        ...(intelligence.stable.largestInflowSourceShare > 0.5
                                            ? [{ icon: "⚠", text: `Single funding source concentration (${(intelligence.stable.largestInflowSourceShare * 100).toFixed(2)}%)`, severity: "warn" as const }]
                                            : []),
                                        ...(intelligence.risk.riskLevel === "HIGH"
                                            ? [{ icon: "🔴", text: "High risk score — loan approval unlikely", severity: "critical" as const }]
                                            : []),
                                    ]}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <StableTreasuryIntelligence
                                    totalInflow={intelligence.stable.totalInflow}
                                    totalOutflow={intelligence.stable.totalOutflow}
                                    netFlow={intelligence.stable.netFlow}
                                    activeMonths={intelligence.stable.activeMonths}
                                    retentionRatio={intelligence.stable.retentionRatio * 100}
                                    largestInflowSourceShare={intelligence.stable.largestInflowSourceShare * 100}
                                    stableScore={intelligence.stable.stableScore}
                                    stableLevel={intelligence.stable.stableLevel}
                                />
                                <DexBehaviorIntelligence
                                    totalSwaps={intelligence.dex.totalSwaps}
                                    totalVolumeUSD={intelligence.dex.totalVolumeUSD}
                                    uniqueTokensTraded={intelligence.dex.uniqueTokensTraded}
                                    avgSwapSizeUSD={intelligence.dex.avgSwapSizeUSD}
                                    swapFrequencyPerMonth={intelligence.dex.swapFrequencyPerMonth}
                                    dexMaturityScore={intelligence.dex.dexMaturityScore}
                                    dexRiskImpact={intelligence.dex.dexRiskImpact}
                                    walletAgeDays={ageDays}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <CrossChainIntelligence
                                    chainsUsedCount={intelligence.crossChain.chainsUsedCount}
                                    activeChains={intelligence.crossChain.activeChains}
                                    totalTxAcrossChains={intelligence.crossChain.totalTxAcrossChains}
                                    crossChainMaturityScore={intelligence.crossChain.crossChainMaturityScore}
                                    chainDetails={intelligence.crossChain.chainDetails}
                                />
                                <LendingHistoryCard
                                    totalBorrows={intelligence.metrics.totalBorrows}
                                    totalRepays={intelligence.metrics.totalRepays}
                                    borrowRepayCycles={intelligence.metrics.borrowRepayCycles}
                                    repayRatio={intelligence.metrics.repayRatio}
                                    liquidations={intelligence.metrics.totalLiquidations}
                                    liquidationRate={intelligence.metrics.liquidationRate}
                                    lendingScoreContribution={intelligence.scoreBreakdown.lending}
                                    lendingScoreMax={40}
                                    activeChains={intelligence.crossChain.activeChains}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                <LoanDecisionCard
                                    recommendedLTV={intelligence.loanProfile.recommendedLTV}
                                    interestTier={intelligence.loanProfile.interestTier}
                                    maxLoanSizeUSD={intelligence.loanProfile.maxLoanSizeUSD}
                                    collateralValueUSD={collateralUSD}
                                    walletCreditScore={intelligence.creditScore}
                                    riskLevel={intelligence.risk.riskLevel}
                                />
                                <OnChainStatusCard
                                    status={data.onchain.status}
                                    remainingSeconds={data.onchain.remainingSeconds}
                                    txHash={data.onchain.txHash}
                                    reportHash={data.onchain.reportHash}
                                    chainName="sepolia"
                                />
                            </div>

                            <RefreshScoreBar
                                address={data.address}
                                onRecheck={handleRecheck}
                                cooldownRemaining={cooldownRemaining}
                            />
                        </main>
                    );
                })()}
            </div>
        </div>
    );
}