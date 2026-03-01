"use client";
import { useEffect, useRef, useState } from "react";

interface ScoreBreakdown {
    lending: number;
    stable: number;
    crossChain: number;
    dex: number;
    ageBonus: number;
    riskPenalty: number;
}

interface CreditScoreBreakdownProps {
    creditScore?: number;
    maxScore?: number;
    breakdown?: ScoreBreakdown;
}

const SEGMENTS = [
    {
        key: "lending",
        label: "Lending",
        color: "#60a5fa",
        glow: "rgba(96,165,250,0.4)",
        tooltip: "Based on Aave borrow/repay history. Active lending history improves underwriting confidence.",
    },
    {
        key: "stable",
        label: "Stable",
        color: "#34d399",
        glow: "rgba(52,211,153,0.4)",
        tooltip: "Stablecoin inflow/outflow behaviour. Consistent stablecoin usage signals financial discipline.",
    },
    {
        key: "crossChain",
        label: "Cross-Chain",
        color: "#818cf8",
        glow: "rgba(129,140,248,0.4)",
        tooltip: "Activity spread across multiple chains. Multi-chain maturity indicates DeFi sophistication.",
    },
    {
        key: "dex",
        label: "DEX",
        color: "#4ef2e8",
        glow: "rgba(78,242,232,0.4)",
        tooltip: "DEX swap volume, frequency and token diversity. High swap maturity improves credit profile.",
    },
    {
        key: "ageBonus",
        label: "Age Bonus",
        color: "#a78bfa",
        glow: "rgba(167,139,250,0.4)",
        tooltip: "Wallet age bonus. Older wallets with sustained activity earn a higher trust multiplier.",
    },
    {
        key: "riskPenalty",
        label: "Risk Penalty",
        color: "#ef4444",
        glow: "rgba(239,68,68,0.5)",
        tooltip: "Risk penalty reduced score due to burst activity & DEX anomaly. Sudden large-volume swaps and irregular token paths flagged.",
        negative: true,
    },
];

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    text: string;
    color: string;
    label: string;
    value: number;
}

export default function CreditScoreBreakdown({
    creditScore = 21,
    maxScore = 100,
    breakdown = {
        lending: 0,
        stable: 15,
        crossChain: 4,
        dex: 11.35,
        ageBonus: 10,
        riskPenalty: 19.25,
    },
}: CreditScoreBreakdownProps) {
    const [animated, setAnimated] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false, x: 0, y: 0, text: "", color: "", label: "", value: 0,
    });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 200);
        return () => clearTimeout(t);
    }, []);

    // Positive sum for bar width calculation
    const positiveTotal = SEGMENTS.filter(s => !s.negative)
        .reduce((sum, s) => sum + (breakdown[s.key as keyof ScoreBreakdown] as number), 0);

    // Each segment's share of the positive bar
    const getWidth = (key: string, negative: boolean) => {
        if (negative) return 0;
        const val = breakdown[key as keyof ScoreBreakdown] as number;
        return positiveTotal > 0 ? (val / positiveTotal) * 100 : 0;
    };

    // Penalty bar width relative to max score
    const penaltyPct = Math.min((breakdown.riskPenalty / maxScore) * 100, 40);

    const handleMouseEnter = (e: React.MouseEvent, seg: typeof SEGMENTS[0]) => {
        const rect = containerRef.current?.getBoundingClientRect();
        const val = breakdown[seg.key as keyof ScoreBreakdown] as number;
        setTooltip({
            visible: true,
            x: e.clientX - (rect?.left ?? 0),
            y: e.clientY - (rect?.top ?? 0),
            text: seg.tooltip,
            color: seg.color,
            label: seg.label,
            value: seg.negative ? -val : val,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        setTooltip(prev => ({
            ...prev,
            x: e.clientX - (rect?.left ?? 0),
            y: e.clientY - (rect?.top ?? 0),
        }));
    };

    const handleMouseLeave = () => setTooltip(prev => ({ ...prev, visible: false }));

    return (
        <div
            ref={containerRef}
            className="dashboardCard"
            style={{ position: "relative", display: "flex", flexDirection: "column", gap: "20px" }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        CREDIT SCORE BREAKDOWN
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ fontSize: "36px", fontWeight: 800, fontFamily: "monospace", color: "white", lineHeight: 1 }}>
                            {creditScore}
                        </span>
                        <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>/ {maxScore}</span>
                    </div>
                </div>
                <div style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    fontSize: "10px",
                    color: "#ef4444",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                }}>
                    ⚠ PENALISED
                </div>
            </div>

            {/* ── Stacked contribution bar ── */}
            <div>
                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "8px" }}>
                    POSITIVE CONTRIBUTIONS
                </p>
                <div style={{
                    display: "flex",
                    height: "28px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    gap: "1px",
                }}>
                    {SEGMENTS.filter(s => !s.negative).map((seg) => {
                        const w = getWidth(seg.key, false);
                        const val = breakdown[seg.key as keyof ScoreBreakdown] as number;
                        if (val === 0) return null;
                        return (
                            <div
                                key={seg.key}
                                onMouseEnter={(e) => handleMouseEnter(e, seg)}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                                style={{
                                    width: animated ? `${w}%` : "0%",
                                    background: seg.color,
                                    transition: `width 1.2s cubic-bezier(0.4,0,0.2,1) ${SEGMENTS.indexOf(seg) * 0.08}s`,
                                    cursor: "crosshair",
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minWidth: w > 8 ? "auto" : "0px",
                                    overflow: "hidden",
                                }}
                            >
                                {w > 10 && (
                                    <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>
                                        +{val}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Penalty bar below */}
                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginTop: "10px", marginBottom: "8px" }}>
                    RISK DEDUCTION
                </p>
                <div style={{
                    height: "28px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    overflow: "hidden",
                    position: "relative",
                }}>
                    <div
                        onMouseEnter={(e) => handleMouseEnter(e, SEGMENTS[5])}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{
                            width: animated ? `${penaltyPct}%` : "0%",
                            height: "100%",
                            background: "linear-gradient(90deg, #ef4444, #f97316)",
                            boxShadow: "0 0 12px rgba(239,68,68,0.4)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: "12px",
                            transition: "width 1.4s cubic-bezier(0.4,0,0.2,1) 0.4s",
                            cursor: "crosshair",
                        }}
                    >
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>
                            −{breakdown.riskPenalty}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Individual breakdown rows ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {SEGMENTS.map((seg, i) => {
                    const raw = breakdown[seg.key as keyof ScoreBreakdown] as number;
                    const val = seg.negative ? -raw : raw;
                    const barPct = seg.negative
                        ? Math.min((raw / maxScore) * 100, 100)
                        : positiveTotal > 0 ? (raw / positiveTotal) * 100 : 0;

                    return (
                        <div
                            key={seg.key}
                            onMouseEnter={(e) => handleMouseEnter(e, seg)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{ cursor: "crosshair" }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{
                                        width: "8px", height: "8px", borderRadius: "2px",
                                        background: seg.color,
                                        boxShadow: `0 0 6px ${seg.glow}`,
                                    }} />
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)" }}>{seg.label}</span>
                                </div>
                                <span style={{
                                    fontSize: "12px", fontWeight: 700,
                                    color: seg.negative ? "#ef4444" : seg.color,
                                    fontFamily: "monospace",
                                }}>
                                    {val > 0 ? "+" : ""}{val}
                                </span>
                            </div>
                            <div style={{
                                height: "5px",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "3px",
                                overflow: "hidden",
                            }}>
                                <div style={{
                                    height: "100%",
                                    width: animated ? `${barPct}%` : "0%",
                                    background: seg.negative
                                        ? "linear-gradient(90deg, #ef4444, #f97316)"
                                        : seg.color,
                                    borderRadius: "3px",
                                    boxShadow: animated ? `0 0 8px ${seg.glow}` : "none",
                                    transition: `width 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.07}s`,
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Tooltip ── */}
            {tooltip.visible && (
                <div style={{
                    position: "absolute",
                    left: Math.min(tooltip.x + 12, 300),
                    top: tooltip.y - 70,
                    pointerEvents: "none",
                    zIndex: 50,
                    maxWidth: "220px",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(10,14,20,0.97)",
                    border: `1px solid ${tooltip.color}44`,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${tooltip.color}22`,
                    backdropFilter: "blur(12px)",
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: tooltip.color }}>{tooltip.label}</span>
                        <span style={{
                            fontSize: "12px", fontWeight: 800, fontFamily: "monospace",
                            color: tooltip.value < 0 ? "#ef4444" : tooltip.color,
                        }}>
                            {tooltip.value > 0 ? "+" : ""}{tooltip.value}
                        </span>
                    </div>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
                        {tooltip.text}
                    </p>
                </div>
            )}
        </div>
    );
}