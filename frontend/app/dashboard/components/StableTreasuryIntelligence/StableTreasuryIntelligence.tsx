"use client";
import { useEffect, useState } from "react";

interface StableTreasuryProps {
    totalInflow?: number;
    totalOutflow?: number;
    netFlow?: number;
    activeMonths?: number;
    retentionRatio?: number;
    largestInflowSourceShare?: number;
    stableScore?: number;
    stableLevel?: string;
}

const SCORE_COLOR = (score: number) =>
    score >= 75 ? "#4ef2e8" : score >= 50 ? "#f59e0b" : "#ef4444";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

// Generate plausible monthly sparkline from totals
function buildSparkline(inflow: number, outflow: number, months: number) {
    const pts = [];
    const base = inflow / Math.max(months, 1);
    for (let i = 0; i < 6; i++) {
        const active = i >= 6 - months;
        const noise = active ? (Math.sin(i * 1.9) * 0.3 + Math.cos(i * 2.7) * 0.2) : 0;
        pts.push(active ? Math.max(0, base * (1 + noise)) : 0);
    }
    return pts;
}

function SparkLine({ values, color }: { values: number[]; color: string }) {
    const W = 200, H = 40, pad = 4;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (W - pad * 2);
        const y = H - pad - (v / max) * (H - pad * 2);
        return `${x},${y}`;
    });
    const fillPts = `${pad},${H - pad} ${pts.join(" ")} ${W - pad},${H - pad}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "40px" }}>
            <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#sparkFill)" />
            <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            {values.map((v, i) => v > 0 && (
                <circle
                    key={i}
                    cx={pad + (i / (values.length - 1)) * (W - pad * 2)}
                    cy={H - pad - (v / max) * (H - pad * 2)}
                    r="2.5" fill={color}
                />
            ))}
        </svg>
    );
}

function PieChart({ dominance }: { dominance: number }) {
    const R = 48, CX = 56, CY = 56;
    const other = 100 - dominance;
    const toRad = (d: number) => (d * Math.PI) / 180;

    function slice(startDeg: number, endDeg: number, color: string, id: string) {
        const s = toRad(startDeg - 90);
        const e = toRad(endDeg - 90);
        const x1 = CX + R * Math.cos(s);
        const y1 = CY + R * Math.sin(s);
        const x2 = CX + R * Math.cos(e);
        const y2 = CY + R * Math.sin(e);
        const large = endDeg - startDeg > 180 ? 1 : 0;
        return (
            <path
                key={id}
                d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
                fill={color}
            />
        );
    }

    const domDeg = (dominance / 100) * 360;

    return (
        <svg viewBox="0 0 112 112" style={{ width: "112px", height: "112px", flexShrink: 0 }}>
            <defs>
                <filter id="pieGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Background circle */}
            <circle cx={CX} cy={CY} r={R} fill="rgba(255,255,255,0.04)" />
            {/* Dominant slice */}
            {slice(0, domDeg, "#ef4444", "dom")}
            {/* Other slice */}
            {other > 0.5 && slice(domDeg, 360, "#4ef2e8", "other")}
            {/* Inner cutout */}
            <circle cx={CX} cy={CY} r={R * 0.54} fill="#0d1117" />
            {/* Center label */}
            <text x={CX} y={CY - 5} textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="800" fontFamily="monospace">
                {dominance}%
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" letterSpacing="1">
                SINGLE SRC
            </text>
        </svg>
    );
}

export default function StableTreasuryIntelligence({
    totalInflow = 204603,
    totalOutflow = 201935,
    netFlow = 2668,
    activeMonths = 3,
    retentionRatio = 98.6,
    largestInflowSourceShare = 99.36,
    stableScore = 60,
    stableLevel = "MODERATE",
}: StableTreasuryProps) {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

    const scoreColor = SCORE_COLOR(stableScore);
    const maxVal = Math.max(totalInflow, totalOutflow);
    const inflowPct = (totalInflow / maxVal) * 100;
    const outflowPct = (totalOutflow / maxVal) * 100;

    const sparkVals = buildSparkline(totalInflow, totalOutflow, activeMonths);

    const stats = [
        { label: "Active Months", value: `${activeMonths}`, unit: "mo" },
        { label: "Retention Ratio", value: `${retentionRatio}%`, unit: "" },
        { label: "Net Flow", value: `+$${netFlow.toLocaleString()}`, unit: "" },
    ];

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 60% at 90% 10%, rgba(52,211,153,0.04) 0%, transparent 70%)",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        STABLE TREASURY INTELLIGENCE
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                        <span style={{ fontSize: "32px", fontWeight: 800, fontFamily: "monospace", color: scoreColor, lineHeight: 1 }}>
                            {stableScore}
                        </span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>/100</span>
                        <span style={{
                            fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
                            color: scoreColor, padding: "2px 10px", borderRadius: "999px",
                            background: `${scoreColor}14`, border: `1px solid ${scoreColor}33`,
                        }}>
                            {stableLevel}
                        </span>
                    </div>
                </div>

                {/* Stat pills */}
                <div style={{ display: "flex", gap: "12px" }}>
                    {stats.map(s => (
                        <div key={s.label} style={{
                            textAlign: "center", padding: "8px 12px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px",
                        }}>
                            <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.07em", marginBottom: "3px" }}>{s.label}</p>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: s.label === "Net Flow" ? "#4ef2e8" : "white" }}>{s.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Warning banner ── */}
            <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 16px", borderRadius: "8px",
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.25)",
            }}>
                <span style={{ fontSize: "16px" }}>🔴</span>
                <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em" }}>
                        High funding centralization detected
                    </p>
                    <p style={{ fontSize: "10px", color: "rgba(239,68,68,0.65)", marginTop: "2px" }}>
                        {largestInflowSourceShare.toFixed(2)}% of inflows originate from a single funding source — increases systemic risk exposure.
                    </p>
                </div>
            </div>

            {/* ── Charts row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "20px", alignItems: "start" }}>

                {/* Inflow vs Outflow bar chart */}
                <div>
                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                        INFLOW VS OUTFLOW
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {[
                            { label: "Inflow", value: totalInflow, pct: inflowPct, color: "#34d399" },
                            { label: "Outflow", value: totalOutflow, pct: outflowPct, color: "#f87171" },
                        ].map(row => (
                            <div key={row.label}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: row.color, fontFamily: "monospace" }}>
                                        ${row.value.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{
                                    height: "10px", background: "rgba(255,255,255,0.05)",
                                    borderRadius: "5px", overflow: "hidden",
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: animated ? `${row.pct}%` : "0%",
                                        background: row.color,
                                        borderRadius: "5px",
                                        boxShadow: `0 0 10px ${row.color}66`,
                                        transition: "width 1.3s cubic-bezier(0.4,0,0.2,1) 0.2s",
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Net flow difference bar */}
                    <div style={{ marginTop: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Net Retained</span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#4ef2e8", fontFamily: "monospace" }}>
                                +${netFlow.toLocaleString()}
                            </span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{
                                height: "100%",
                                width: animated ? `${(netFlow / totalInflow) * 100 * 8}%` : "0%",
                                background: "linear-gradient(90deg, #4ef2e8, #34d399)",
                                borderRadius: "3px",
                                transition: "width 1.4s cubic-bezier(0.4,0,0.2,1) 0.4s",
                            }} />
                        </div>
                    </div>
                </div>

                {/* Net flow sparkline */}
                <div>
                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                        MONTHLY NET FLOW
                    </p>
                    <SparkLine values={sparkVals} color="#4ef2e8" />
                    {/* Month labels */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                        {MONTHS.map((m, i) => (
                            <span key={m} style={{
                                fontSize: "8px",
                                color: i >= 6 - activeMonths ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)",
                            }}>
                                {m}
                            </span>
                        ))}
                    </div>

                    {/* Total summary */}
                    <div style={{
                        marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                    }}>
                        {[
                            { label: "Total In", value: `$${(totalInflow / 1000).toFixed(1)}k`, color: "#34d399" },
                            { label: "Total Out", value: `$${(totalOutflow / 1000).toFixed(1)}k`, color: "#f87171" },
                        ].map(s => (
                            <div key={s.label} style={{
                                padding: "8px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.05)",
                            }}>
                                <p style={{ fontSize: "9px", color: "var(--color-muted)" }}>{s.label}</p>
                                <p style={{ fontSize: "13px", fontWeight: 700, color: s.color, marginTop: "2px" }}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Funding concentration pie */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em" }}>
                        FUNDING SOURCE
                    </p>
                    <PieChart dominance={Math.round(largestInflowSourceShare)} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
                        {[
                            { label: "Primary Source", color: "#ef4444", pct: largestInflowSourceShare },
                            { label: "Other Sources", color: "#4ef2e8", pct: 100 - largestInflowSourceShare },
                        ].map(s => (
                            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{ width: "6px", height: "6px", borderRadius: "1px", background: s.color, flexShrink: 0 }} />
                                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", flex: 1 }}>{s.label}</span>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: s.color, fontFamily: "monospace" }}>
                                    {s.pct.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}