"use client";
import { useEffect, useState } from "react";

interface DexBehaviorProps {
    totalSwaps?: number;
    totalVolumeUSD?: number;
    uniqueTokensTraded?: number;
    avgSwapSizeUSD?: number;
    swapFrequencyPerMonth?: number;
    dexMaturityScore?: number;
    dexRiskImpact?: number;
    walletAgeDays?: number;
}

const buildAxes = (p: DexBehaviorProps) => [
    {
        key: "volume",
        label: "Volume",
        sublabel: `$${((p.totalVolumeUSD ?? 0) / 1000).toFixed(0)}k`,
        max: 500000,
        getValue: (p: DexBehaviorProps) => (p.totalVolumeUSD ?? 0) / 500000,
        color: "#4ef2e8",
    },
    {
        key: "frequency",
        label: "Frequency",
        sublabel: `${Math.round(p.swapFrequencyPerMonth ?? 0)}/mo`,
        max: 5000,
        getValue: (p: DexBehaviorProps) => (p.swapFrequencyPerMonth ?? 0) / 5000,
        color: "#f59e0b",
        anomaly: true,
    },
    {
        key: "tokenDiversity",
        label: "Token Diversity",
        sublabel: `${p.uniqueTokensTraded ?? 0} tokens`,
        max: 20,
        getValue: (p: DexBehaviorProps) => (p.uniqueTokensTraded ?? 0) / 20,
        color: "#818cf8",
    },
    {
        key: "longevity",
        label: "Longevity",
        sublabel: `~${Math.round(p.walletAgeDays ?? 0)} days`,
        max: 365,
        getValue: (p: DexBehaviorProps) => Math.min((p.walletAgeDays ?? 0) / 365, 1),
        color: "#34d399",
    },
    {
        key: "avgSize",
        label: "Avg Size",
        sublabel: `$${(p.avgSwapSizeUSD ?? 0).toFixed(2)}`,
        max: 500,
        getValue: (p: DexBehaviorProps) => Math.min((p.avgSwapSizeUSD ?? 0) / 500, 1),
        color: "#a78bfa",
    },
];

type Axes = ReturnType<typeof buildAxes>;

function polarToXY(angleDeg: number, r: number, cx: number, cy: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RadarChart({ values, axes }: { values: number[]; axes: Axes }) {
    const [animated, setAnimated] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 300);
        return () => clearTimeout(t);
    }, []);

    const CX = 140, CY = 130, MAX_R = 95;
    const N = axes.length;
    const angleStep = 360 / N;
    const rings = [0.25, 0.5, 0.75, 1.0];

    const axisPoints = axes.map((_, i) => polarToXY(i * angleStep, MAX_R, CX, CY));

    const dataPoints = values.map((v, i) =>
        polarToXY(i * angleStep, (animated ? v : 0) * MAX_R, CX, CY)
    );
    const dataPath =
        dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z";

    const freqPt = polarToXY(angleStep, (animated ? values[1] : 0) * MAX_R, CX, CY);

    return (
        <svg viewBox="0 0 280 260" style={{ width: "100%", maxWidth: "280px" }}>
            <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4ef2e8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4ef2e8" stopOpacity="0.04" />
                </radialGradient>
                <filter id="radarGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Grid rings */}
            {rings.map((r, ri) => {
                const ringPts =
                    axes.map((_, i) => {
                        const p = polarToXY(i * angleStep, r * MAX_R, CX, CY);
                        return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
                    }).join(" ") + " Z";
                return (
                    <path
                        key={ri}
                        d={ringPts}
                        fill="none"
                        stroke={ri === rings.length - 1 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)"}
                        strokeWidth={ri === rings.length - 1 ? "1" : "0.75"}
                        strokeDasharray={ri === rings.length - 1 ? "none" : "3 3"}
                    />
                );
            })}

            {/* Axis lines */}
            {axisPoints.map((pt, i) => (
                <line key={i} x1={CX} y1={CY} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            ))}

            {/* Data fill */}
            <path d={dataPath} fill="url(#radarFill)" style={{ transition: "all 1.2s cubic-bezier(0.4,0,0.2,1)" }} />

            {/* Data stroke */}
            <path
                d={dataPath}
                fill="none"
                stroke="rgba(78,242,232,0.75)"
                strokeWidth="2"
                filter="url(#radarGlow)"
                style={{ transition: "all 1.2s cubic-bezier(0.4,0,0.2,1)" }}
            />

            {/* Data dots */}
            {dataPoints.map((pt, i) => (
                <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={axes[i].anomaly ? "#ef4444" : "#4ef2e8"}
                    style={{
                        filter: `drop-shadow(0 0 ${axes[i].anomaly ? "8px #ef4444" : "5px #4ef2e8"})`,
                        transition: `all 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s`,
                    }}
                />
            ))}

            {/* Anomaly pulse on frequency dot */}
            {animated && (
                <>
                    <circle cx={freqPt.x} cy={freqPt.y} r="10" fill="none" stroke="rgba(239,68,68,0.35)" strokeWidth="1.5"
                        style={{ animation: "radarPulse 1.8s ease-out infinite" }} />
                    <circle cx={freqPt.x} cy={freqPt.y} r="16" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="1"
                        style={{ animation: "radarPulse 1.8s ease-out infinite 0.3s" }} />
                </>
            )}

            {/* Ring value labels */}
            {rings.map((r, ri) => {
                const p = polarToXY(0, r * MAX_R, CX, CY);
                return (
                    <text key={ri} x={p.x + 4} y={p.y - 2} fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">
                        {Math.round(r * 100)}
                    </text>
                );
            })}

            {/* Axis labels */}
            {axes.map((ax, i) => {
                const pt = polarToXY(i * angleStep, MAX_R + 22, CX, CY);
                const subPt = polarToXY(i * angleStep, MAX_R + 32, CX, CY);
                return (
                    <g key={i}>
                        <text x={pt.x} y={pt.y} textAnchor="middle"
                            fill={ax.anomaly ? "#ef4444" : ax.color} fontSize="9" fontWeight="700" letterSpacing="0.5">
                            {ax.label}
                        </text>
                        <text x={subPt.x} y={subPt.y + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7.5">
                            {ax.sublabel}
                        </text>
                    </g>
                );
            })}

            <style>{`@keyframes radarPulse { 0% { opacity: 1; r: 10; } 100% { opacity: 0; r: 26; } }`}</style>
        </svg>
    );
}

export default function DexBehaviorIntelligence({
    totalSwaps = 3000,
    totalVolumeUSD = 173651,
    uniqueTokensTraded = 2,
    avgSwapSizeUSD = 57.88,
    swapFrequencyPerMonth = 3000,
    dexMaturityScore = 75.7,
    dexRiskImpact = 15,
    walletAgeDays = 5.17,
}: DexBehaviorProps) {
    const [animated, setAnimated] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 150);
        return () => clearTimeout(t);
    }, []);

    const props = { totalSwaps, totalVolumeUSD, uniqueTokensTraded, avgSwapSizeUSD, swapFrequencyPerMonth, dexMaturityScore, dexRiskImpact, walletAgeDays };
    const AXES = buildAxes(props);
    const radarValues = AXES.map(ax => Math.min(ax.getValue(props), 1));

    // ── Dynamic derived values ──────────────────────────────────────────────
    const dexLevel = dexMaturityScore >= 75 ? "STRONG" : dexMaturityScore >= 50 ? "MODERATE" : "WEAK";
    const dexLevelColor = dexMaturityScore >= 75 ? "#4ef2e8" : dexMaturityScore >= 50 ? "#f59e0b" : "#ef4444";

    // Swap density: swaps per day relative to wallet age
    const swapsPerDay = walletAgeDays > 0 ? totalSwaps / walletAgeDays : 0;
    const densityPct = Math.min((swapFrequencyPerMonth / 5000) * 100, 100);
    const densityLabel = densityPct >= 80 ? "EXTREME" : densityPct >= 50 ? "HIGH" : densityPct >= 25 ? "MODERATE" : "LOW";
    const isAbnormal = swapFrequencyPerMonth > 500;

    const metrics = [
        { label: "Total Swaps", value: totalSwaps.toLocaleString(), color: "#4ef2e8" },
        { label: "Volume", value: `$${totalVolumeUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "#4ef2e8" },
        { label: "Unique Tokens", value: String(uniqueTokensTraded), color: "#818cf8" },
        { label: "Avg Swap", value: `$${avgSwapSizeUSD.toFixed(2)}`, color: "#a78bfa" },
        { label: "Freq/Month", value: Math.round(swapFrequencyPerMonth).toLocaleString(), color: "#ef4444" },
        { label: "Risk Impact", value: `+${dexRiskImpact}`, color: "#ef4444" },
    ];

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "18px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 50% 50% at 30% 50%, rgba(78,242,232,0.03) 0%, transparent 70%)",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        DEX BEHAVIOR INTELLIGENCE
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ fontSize: "32px", fontWeight: 800, fontFamily: "monospace", color: dexLevelColor, lineHeight: 1 }}>
                            {dexMaturityScore.toFixed(1)}
                        </span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>/ 100</span>
                        <span style={{
                            fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
                            color: dexLevelColor, padding: "2px 10px", borderRadius: "999px",
                            background: `${dexLevelColor}14`, border: `1px solid ${dexLevelColor}33`,
                        }}>
                            {dexLevel}
                        </span>
                    </div>
                </div>

                {/* Anomaly badge — only shows if abnormal */}
                {isAbnormal && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "6px 12px", borderRadius: "8px",
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    }}>
                        <span style={{ fontSize: "12px" }}>🔴</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#ef4444", letterSpacing: "0.06em" }}>
                            ABNORMAL SWAP DENSITY
                        </span>
                    </div>
                )}
            </div>

            {/* ── Main layout: radar + metrics ── */}
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>

                {/* Radar */}
                <div style={{ flexShrink: 0, width: "280px" }}>
                    <RadarChart values={radarValues} axes={AXES} />
                </div>

                {/* Right column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>

                    {/* Metric grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {metrics.map(m => (
                            <div key={m.label} style={{
                                padding: "10px 12px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                            }}>
                                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.07em", marginBottom: "4px" }}>
                                    {m.label}
                                </p>
                                <p style={{ fontSize: "15px", fontWeight: 700, color: m.color, fontFamily: "monospace" }}>
                                    {m.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Swap density bar */}
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Swap Density vs Wallet Age</span>
                            <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700 }}>{densityLabel}</span>
                        </div>
                        <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{
                                height: "100%",
                                width: animated ? `${densityPct}%` : "0%",
                                background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                                borderRadius: "4px",
                                boxShadow: "0 0 12px rgba(239,68,68,0.5)",
                                transition: "width 1.3s cubic-bezier(0.4,0,0.2,1) 0.3s",
                            }} />
                        </div>
                        {isAbnormal && (
                            <p style={{
                                fontSize: "10px", color: "rgba(245,158,11,0.7)",
                                marginTop: "6px", lineHeight: 1.5,
                                padding: "8px 12px",
                                background: "rgba(245,158,11,0.06)",
                                border: "1px solid rgba(245,158,11,0.15)",
                                borderRadius: "6px",
                            }}>
                                ⚠ High frequency relative to wallet age. {totalSwaps.toLocaleString()} swaps
                                in ~{Math.round(walletAgeDays)} days ({swapsPerDay.toFixed(0)}/day) signals
                                automated or bot-like behaviour, increasing risk classification.
                            </p>
                        )}
                    </div>

                    {/* DEX risk contribution */}
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderRadius: "8px",
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                    }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>DEX Risk Contribution to Final Score</span>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>
                            +{dexRiskImpact}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}