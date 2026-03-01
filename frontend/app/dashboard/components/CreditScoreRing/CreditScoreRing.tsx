"use client";
import { useEffect, useState } from "react";

interface ScoreBreakdown {
    lending: number;
    stable: number;
    crossChain: number;
    dex: number;
    ageBonus: number;
    riskPenalty: number;
}

interface CreditScoreRingProps {
    score?: number;
    maxScore?: number;
    riskLevel?: string;
    rwaScore?: number;
    onchainScore?: number;
    breakdown?: ScoreBreakdown;
    interestTier?: string;
    maxLoanSizeUSD?: number;
    recommendedLTV?: number;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CreditScoreRing({
    score = 3,
    maxScore = 100,
    riskLevel = "MEDIUM",
    rwaScore,
    onchainScore,
    breakdown,
    interestTier = "REJECT",
    maxLoanSizeUSD = 0,
    recommendedLTV = 0,
}: CreditScoreRingProps) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 100);
        return () => clearTimeout(t);
    }, []);

    const pct = score / maxScore;
    const offset = CIRCUMFERENCE - pct * CIRCUMFERENCE;

    const riskColor =
        riskLevel === "LOW"
            ? "#4ef2e8"
            : riskLevel === "HIGH"
                ? "#ef4444"
                : "#f59e0b";

    const breakdownItems = breakdown
        ? [
            { label: "DEX Score", value: breakdown.dex, max: 20, color: "#4ef2e8" },
            { label: "Age Bonus", value: breakdown.ageBonus, max: 20, color: "#818cf8" },
            { label: "Cross-Chain", value: breakdown.crossChain, max: 20, color: "#34d399" },
            { label: "Stable Score", value: breakdown.stable, max: 10, color: "#a78bfa" },
            { label: "Lending", value: breakdown.lending, max: 20, color: "#60a5fa" },
            { label: "Risk Penalty", value: -breakdown.riskPenalty, max: 0, color: "#f87171", negative: true },
        ]
        : [];

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em" }}>
                    CROSS-CHAIN CREDIT SCORE
                </p>
                <span
                    style={{
                        fontSize: "10px",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        border: `1px solid ${riskColor}`,
                        color: riskColor,
                        letterSpacing: "0.08em",
                    }}
                >
                    RISK: {riskLevel}
                </span>
            </div>

            {/* Top section: ring + breakdown side by side */}
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                {/* Ring */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <svg width="160" height="160">
                        <defs>
                            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4ef2e8" />
                                <stop offset="100%" stopColor="#d946ef" />
                            </linearGradient>
                        </defs>
                        {/* Track */}
                        <circle cx="80" cy="80" r={RADIUS} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
                        {/* Progress */}
                        <circle
                            cx="80"
                            cy="80"
                            r={RADIUS}
                            stroke="url(#scoreGrad)"
                            strokeWidth="10"
                            fill="none"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={animated ? offset : CIRCUMFERENCE}
                            strokeLinecap="round"
                            transform="rotate(-90 80 80)"
                            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
                        />
                        {/* Score text */}
                        <text x="80" y="74" textAnchor="middle" fill="white" fontSize="28" fontWeight="700">
                            {score}
                        </text>
                        <text x="80" y="94" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">
                            / {maxScore}
                        </text>
                    </svg>

                    {/* RWA / Onchain sub-scores */}
                    {(rwaScore !== undefined || onchainScore !== undefined) && (
                        <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                            {rwaScore !== undefined && (
                                <span style={{ fontSize: "11px", color: "#4ef2e8" }}>RWA {rwaScore}</span>
                            )}
                            {onchainScore !== undefined && (
                                <span style={{ fontSize: "11px", color: "#d946ef" }}>Onchain {onchainScore}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Breakdown bars */}
                {breakdownItems.length > 0 && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontSize: "10px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "4px" }}>
                            SCORE BREAKDOWN
                        </p>
                        {breakdownItems.map((item) => {
                            const barPct = item.negative
                                ? Math.min(Math.abs(item.value) / 20, 1)
                                : Math.min(item.value / (item.max || 20), 1);
                            return (
                                <div key={item.label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                color: item.negative ? "#f87171" : item.color,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {item.negative ? "" : "+"}{item.value.toFixed(1)}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            height: "4px",
                                            background: "rgba(255,255,255,0.06)",
                                            borderRadius: "2px",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: "100%",
                                                width: animated ? `${barPct * 100}%` : "0%",
                                                background: item.color,
                                                borderRadius: "2px",
                                                transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                                                opacity: 0.85,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Loan profile */}
            <div
                style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: "12px",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                    textAlign: "center",
                }}
            >
                {[
                    { label: "Interest Tier", value: interestTier, highlight: interestTier !== "REJECT" },
                    { label: "Max Loan", value: `$${maxLoanSizeUSD.toLocaleString()}` },
                    { label: "Rec. LTV", value: `${recommendedLTV}%` },
                ].map((item) => (
                    <div key={item.label}>
                        <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em" }}>{item.label}</p>
                        <p
                            style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: item.highlight ? "#4ef2e8" : "rgba(255,255,255,0.85)",
                                marginTop: "2px",
                            }}
                        >
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}