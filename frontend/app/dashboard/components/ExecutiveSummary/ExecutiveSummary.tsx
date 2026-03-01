"use client";
import { useEffect, useState } from "react";

interface ExecutiveSummaryProps {
    walletAddress?: string;
    ethBalance?: string;
    totalTransactions?: number;
    walletAgeDays?: number;
    creditScore?: number;
    maxCreditScore?: number;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH";
    recommendedLTV?: number;
    interestTier?: string;
    maxLoanSizeUSD?: number;
}

const RISK_CONFIG = {
    LOW: { color: "#4ef2e8", bg: "rgba(78,242,232,0.08)", border: "rgba(78,242,232,0.25)" },
    MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
    HIGH: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)" },
};

function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ExecutiveSummary({
    walletAddress = "0x0000000000000000000000000000000000000000",
    ethBalance = "0.0658",
    totalTransactions = 7451,
    walletAgeDays = 5.17,
    creditScore = 21,
    maxCreditScore = 100,
    riskLevel = "MEDIUM",
    recommendedLTV = 0,
    interestTier = "REJECT",
    maxLoanSizeUSD = 0,
}: ExecutiveSummaryProps) {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t); }, []);

    const risk = RISK_CONFIG[riskLevel];
    const isRejected = interestTier === "REJECT" || maxLoanSizeUSD === 0;

    // SVG gauge
    const R = 80;
    const CX = 110;
    const CY = 110;
    const STROKE = 12;
    const GAP_DEG = 60; // degrees cut from the bottom
    const ARC_DEG = 360 - GAP_DEG;
    const START_DEG = 90 + GAP_DEG / 2;        // starts bottom-left
    const pct = creditScore / maxCreditScore;
    const toRad = (d: number) => (d * Math.PI) / 180;

    function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
        const s = toRad(startDeg);
        const e = toRad(endDeg);
        const x1 = cx + r * Math.cos(s);
        const y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e);
        const y2 = cy + r * Math.sin(e);
        const large = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    }

    const trackPath = arcPath(CX, CY, R, START_DEG, START_DEG + ARC_DEG);
    const scorePath = arcPath(CX, CY, R, START_DEG, START_DEG + ARC_DEG * (animated ? pct : 0));

    // Circumference-based approach for dash animation
    const fullLen = (ARC_DEG / 360) * 2 * Math.PI * R;
    const scoreLen = fullLen * pct;

    const stats = [
        { label: "ETH Balance", value: ethBalance, unit: "ETH" },
        { label: "Total TXs", value: totalTransactions.toLocaleString(), unit: "" },
        { label: "Wallet Age", value: walletAgeDays.toFixed(2), unit: "days" },
    ];

    const loanStats = [
        { label: "Rec. LTV", value: `${recommendedLTV}%` },
        { label: "Interest Tier", value: interestTier },
        { label: "Max Loan", value: `$${maxLoanSizeUSD.toLocaleString()}` },
    ];

    return (
        <div
            className="dashboardCard"
            style={{
                gridColumn: "1 / -1",  /* spans full width */
                display: "grid",
                gridTemplateColumns: "220px 1fr auto",
                gap: "32px",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Subtle background glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: isRejected
                    ? "radial-gradient(ellipse 60% 80% at 15% 50%, rgba(239,68,68,0.04) 0%, transparent 70%)"
                    : "radial-gradient(ellipse 60% 80% at 15% 50%, rgba(78,242,232,0.04) 0%, transparent 70%)",
            }} />

            {/* ── Col 1: Gauge ───────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <svg width={CX * 2} height={CY * 2 - 20} style={{ overflow: "visible" }}>
                    <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={isRejected ? "#ef4444" : "#4ef2e8"} />
                            <stop offset="100%" stopColor={isRejected ? "#f97316" : "#d946ef"} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Track */}
                    <path
                        d={trackPath}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                    />

                    {/* Score arc */}
                    <path
                        d={trackPath}
                        fill="none"
                        stroke="url(#gaugeGrad)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${fullLen}`}
                        strokeDashoffset={animated ? fullLen - scoreLen : fullLen}
                        filter="url(#glow)"
                        style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)" }}
                    />

                    {/* Score number */}
                    <text x={CX} y={CY - 8} textAnchor="middle" fill="white" fontSize="36" fontWeight="800" fontFamily="monospace">
                        {creditScore}
                    </text>
                    <text x={CX} y={CY + 14} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12">
                        / {maxCreditScore}
                    </text>
                    <text x={CX} y={CY + 32} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="10" letterSpacing="2">
                        CREDIT SCORE
                    </text>
                </svg>

                {/* Risk badge */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "5px 14px", borderRadius: "999px",
                    background: risk.bg, border: `1px solid ${risk.border}`,
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: risk.color }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: risk.color, letterSpacing: "0.1em" }}>
                        {riskLevel} RISK
                    </span>
                </div>
            </div>

            {/* ── Col 2: Wallet info + stats ──────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Address */}
                <div>
                    <p style={{ fontSize: "10px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "4px" }}>
                        WALLET ADDRESS
                    </p>
                    <p style={{ fontSize: "14px", fontFamily: "monospace", color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em" }}>
                        {walletAddress.length > 20 ? shortAddress(walletAddress) : walletAddress}
                        <span
                            title={walletAddress}
                            style={{ marginLeft: "8px", fontSize: "10px", color: "#4ef2e8", cursor: "pointer", opacity: 0.7 }}
                        >
                            ↗
                        </span>
                    </p>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: "24px" }}>
                    {stats.map((s) => (
                        <div key={s.label} style={{
                            padding: "12px 16px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "10px",
                            minWidth: "110px",
                        }}>
                            <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "6px" }}>
                                {s.label}
                            </p>
                            <p style={{ fontSize: "18px", fontWeight: 700, color: "white", lineHeight: 1 }}>
                                {s.value}
                                {s.unit && <span style={{ fontSize: "10px", color: "var(--color-muted)", marginLeft: "4px" }}>{s.unit}</span>}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Loan profile row */}
                <div style={{ display: "flex", gap: "16px" }}>
                    {loanStats.map((s) => (
                        <div key={s.label}>
                            <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "3px" }}>
                                {s.label}
                            </p>
                            <p style={{
                                fontSize: "13px", fontWeight: 600,
                                color: s.value === "REJECT" ? "#ef4444" : "rgba(255,255,255,0.85)",
                            }}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Col 3: Decision banner ──────────────────────────── */}
            <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "10px",
                padding: "24px 28px",
                borderRadius: "14px",
                border: `1px solid ${isRejected ? "rgba(239,68,68,0.25)" : "rgba(78,242,232,0.25)"}`,
                background: isRejected ? "rgba(239,68,68,0.06)" : "rgba(78,242,232,0.06)",
                minWidth: "220px",
                textAlign: "center",
            }}>
                <div style={{ fontSize: "28px" }}>{isRejected ? "🔴" : "🟢"}</div>
                <p style={{ fontSize: "10px", color: "var(--color-muted)", letterSpacing: "0.1em" }}>
                    CAPITAL ALLOCATION
                </p>
                <p style={{
                    fontSize: "16px", fontWeight: 800, letterSpacing: "0.06em",
                    color: isRejected ? "#ef4444" : "#4ef2e8",
                }}>
                    {isRejected ? "REJECTED" : "APPROVED"}
                </p>
                {isRejected && (
                    <p style={{ fontSize: "10px", color: "rgba(239,68,68,0.6)", maxWidth: "160px", lineHeight: 1.5 }}>
                        Insufficient on-chain credit history for capital deployment.
                    </p>
                )}
            </div>
        </div>
    );
}