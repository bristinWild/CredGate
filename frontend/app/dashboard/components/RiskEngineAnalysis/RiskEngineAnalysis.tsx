"use client";
import { useEffect, useState } from "react";

interface RiskStep {
    label: string;
    shortLabel: string;
    delta: number;
    running: number;
    color: string;
    glow: string;
    type: "base" | "add" | "subtract" | "final";
    description: string;
}

interface RiskEngineProps {
    finalRisk?: number;
    baseRisk?: number;
    dexRiskImpact?: number;
    burstPenalty?: number;
    stableMitigation?: number;
    crossChainImpact?: number;
    alerts?: { icon: string; text: string; severity: "warn" | "critical" }[];
}

export default function RiskEngineAnalysis({
    finalRisk = 55,
    baseRisk = 35,
    dexRiskImpact = 15,
    burstPenalty = 15,
    stableMitigation = 10,
    crossChainImpact = 0,
    alerts = [],
}: RiskEngineProps) {
    const [animated, setAnimated] = useState(false);
    const [hoveredStep, setHoveredStep] = useState<number | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 200);
        return () => clearTimeout(t);
    }, []);

    // ── Dynamic risk level ──────────────────────────────────────────────────
    const riskColor =
        finalRisk >= 70 ? "#ef4444" :
            finalRisk >= 40 ? "#f59e0b" : "#4ef2e8";

    const riskLabel =
        finalRisk >= 70 ? "HIGH RISK" :
            finalRisk >= 40 ? "MEDIUM RISK" : "LOW RISK";

    const riskBadgeBg =
        finalRisk >= 70 ? "rgba(239,68,68,0.1)" :
            finalRisk >= 40 ? "rgba(245,158,11,0.1)" : "rgba(78,242,232,0.1)";

    const riskBadgeBorder =
        finalRisk >= 70 ? "rgba(239,68,68,0.3)" :
            finalRisk >= 40 ? "rgba(245,158,11,0.3)" : "rgba(78,242,232,0.3)";

    // ── Running totals per step ─────────────────────────────────────────────
    const afterDex = baseRisk + dexRiskImpact;
    const afterBurst = afterDex + burstPenalty;
    const afterStable = afterBurst - stableMitigation;
    const afterCross = afterStable - crossChainImpact;

    const steps: RiskStep[] = [
        {
            label: "Base Risk",
            shortLabel: "BASE",
            delta: baseRisk,
            running: baseRisk,
            color: "#94a3b8",
            glow: "rgba(148,163,184,0.3)",
            type: "base",
            description: "Baseline risk assigned to every wallet before behavioural analysis.",
        },
        {
            label: "DEX Risk Impact",
            shortLabel: "DEX",
            delta: dexRiskImpact,
            running: afterDex,
            color: "#f59e0b",
            glow: "rgba(245,158,11,0.35)",
            type: dexRiskImpact > 0 ? "add" : "base",
            description: "Risk added from DEX swap behaviour. High-frequency or irregular swaps increase this.",
        },
        {
            label: "Burst Activity Penalty",
            shortLabel: "BURST",
            delta: burstPenalty,
            running: afterBurst,
            color: "#ef4444",
            glow: "rgba(239,68,68,0.4)",
            type: "add",
            description: "Penalty for sudden spikes in swap volume within a short window.",
        },
        {
            label: "Stable Mitigation",
            shortLabel: "STABLE",
            delta: -stableMitigation,
            running: afterStable,
            color: "#34d399",
            glow: "rgba(52,211,153,0.35)",
            type: "subtract",
            description: "Stablecoin treasury score partially offsets behavioural risk penalties.",
        },
        {
            label: "Cross-Chain Bonus",
            shortLabel: "CROSS",
            delta: -crossChainImpact,
            running: crossChainImpact > 0 ? afterCross : afterStable,
            color: "#818cf8",
            glow: "rgba(129,140,248,0.35)",
            type: crossChainImpact > 0 ? "subtract" : "base",
            description: "Multi-chain activity demonstrates portfolio maturity and reduces systemic risk concentration.",
        },
        {
            label: "Final Risk Score",
            shortLabel: "FINAL",
            delta: 0,
            running: finalRisk,
            color: riskColor,
            glow: `${riskColor}80`,
            type: "final",
            description: "Composite risk score used by the underwriting engine for loan decisions.",
        },
    ];

    const maxRisk = 100;
    const W = 520;
    const H = 140;
    const PAD_X = 30;
    const PAD_Y = 16;
    const chartW = W - PAD_X * 2;
    const chartH = H - PAD_Y * 2;
    const stepW = chartW / (steps.length - 1);

    const toY = (val: number) =>
        PAD_Y + chartH - (Math.max(0, Math.min(val, maxRisk)) / maxRisk) * chartH;
    const toX = (i: number) => PAD_X + i * stepW;

    let pathD = "";
    steps.forEach((step, i) => {
        const x = toX(i);
        const y = toY(step.running);
        if (i === 0) {
            pathD += `M ${x} ${y}`;
        } else {
            pathD += ` H ${x} V ${y}`;
        }
    });

    const fillD = pathD + ` V ${H - PAD_Y} H ${PAD_X} Z`;

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(245,158,11,0.04) 0%, transparent 70%)",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        RISK ENGINE ANALYSIS
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ fontSize: "36px", fontWeight: 800, fontFamily: "monospace", color: riskColor, lineHeight: 1 }}>
                            {finalRisk}
                        </span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>/ 100 risk</span>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <div style={{
                        padding: "5px 12px", borderRadius: "999px",
                        background: riskBadgeBg, border: `1px solid ${riskBadgeBorder}`,
                        fontSize: "11px", fontWeight: 700, color: riskColor, letterSpacing: "0.08em",
                    }}>
                        {riskLabel}
                    </div>
                </div>
            </div>

            {/* ── Step-line chart ── */}
            <div style={{ position: "relative" }}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "140px", overflow: "visible" }}>
                    <defs>
                        <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
                            <stop offset="100%" stopColor="rgba(245,158,11,0)" />
                        </linearGradient>
                        <filter id="stepGlow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(v => (
                        <g key={v}>
                            <line x1={PAD_X} y1={toY(v)} x2={W - PAD_X} y2={toY(v)}
                                stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={PAD_X - 6} y={toY(v) + 3} fill="rgba(255,255,255,0.2)" fontSize="8" textAnchor="end">
                                {v}
                            </text>
                        </g>
                    ))}

                    {/* Fill */}
                    <path d={fillD} fill="url(#riskFill)"
                        opacity={animated ? 1 : 0}
                        style={{ transition: "opacity 0.8s ease 0.3s" }}
                    />

                    {/* Step line */}
                    <path d={pathD} fill="none" stroke="rgba(245,158,11,0.8)" strokeWidth="2.5"
                        strokeLinejoin="miter" filter="url(#stepGlow)"
                        opacity={animated ? 1 : 0}
                        style={{ transition: "opacity 0.6s ease 0.2s" }}
                    />

                    {/* Dots + axis labels */}
                    {steps.map((step, i) => {
                        const x = toX(i);
                        const y = toY(step.running);
                        const isHovered = hoveredStep === i;
                        const dotColor = step.type === "final" ? riskColor : step.color;

                        return (
                            <g key={step.label}>
                                <rect x={x - 20} y={PAD_Y} width={40} height={chartH}
                                    fill="transparent" style={{ cursor: "crosshair" }}
                                    onMouseEnter={() => setHoveredStep(i)}
                                    onMouseLeave={() => setHoveredStep(null)}
                                />
                                {isHovered && (
                                    <line x1={x} y1={PAD_Y} x2={x} y2={H - PAD_Y}
                                        stroke={dotColor} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
                                )}
                                <circle cx={x} cy={y} r={isHovered ? 7 : 5}
                                    fill={dotColor} opacity={animated ? 1 : 0}
                                    style={{
                                        transition: `opacity 0.4s ease ${i * 0.1}s`,
                                        filter: `drop-shadow(0 0 6px ${dotColor})`,
                                        cursor: "crosshair",
                                    }}
                                    onMouseEnter={() => setHoveredStep(i)}
                                    onMouseLeave={() => setHoveredStep(null)}
                                />
                                {isHovered && (
                                    <g>
                                        <rect x={x - 22} y={y - 28} width={44} height={18}
                                            rx="4" fill="rgba(10,14,20,0.95)"
                                            stroke={`${dotColor}44`} strokeWidth="1" />
                                        <text x={x} y={y - 15} textAnchor="middle"
                                            fill={dotColor} fontSize="10" fontWeight="700" fontFamily="monospace">
                                            {step.running}
                                        </text>
                                    </g>
                                )}
                                <text x={x} y={H + 2} textAnchor="middle"
                                    fill={isHovered ? dotColor : "rgba(255,255,255,0.3)"}
                                    fontSize="8" fontWeight={isHovered ? "700" : "400"}
                                    style={{ transition: "fill 0.15s" }}>
                                    {step.shortLabel}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredStep !== null && (
                    <div style={{
                        position: "absolute", bottom: "24px", left: "50%",
                        transform: "translateX(-50%)", pointerEvents: "none",
                        padding: "10px 14px", borderRadius: "10px",
                        background: "rgba(10,14,20,0.97)",
                        border: `1px solid ${steps[hoveredStep].color}44`,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        backdropFilter: "blur(12px)", minWidth: "220px", textAlign: "center",
                    }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: steps[hoveredStep].color, marginBottom: "4px" }}>
                            {steps[hoveredStep].label}
                        </p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
                            {steps[hoveredStep].description}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Risk Ladder ── */}
            <div>
                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    RISK COMPOSITION LADDER
                </p>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", overflowX: "auto" }}>
                    {steps.map((step, i) => (
                        <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                            <div
                                onMouseEnter={() => setHoveredStep(i)}
                                onMouseLeave={() => setHoveredStep(null)}
                                style={{
                                    display: "flex", flexDirection: "column", alignItems: "center",
                                    padding: "8px 12px", borderRadius: "8px",
                                    background: hoveredStep === i ? `${step.color}18` : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${hoveredStep === i ? step.color + "44" : "rgba(255,255,255,0.06)"}`,
                                    cursor: "default", transition: "all 0.2s ease",
                                    minWidth: "56px", textAlign: "center",
                                }}
                            >
                                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", marginBottom: "4px" }}>
                                    {step.shortLabel}
                                </span>
                                <span style={{
                                    fontSize: "14px", fontWeight: 800, fontFamily: "monospace",
                                    color: step.type === "final" ? riskColor : step.color,
                                }}>
                                    {step.type === "subtract"
                                        ? `−${Math.abs(step.delta)}`
                                        : step.type === "add"
                                            ? `+${step.delta}`
                                            : step.type === "base"
                                                ? step.delta === 0 ? "+0" : step.delta
                                                : step.running}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.15)", padding: "0 4px", flexShrink: 0 }}>
                                    →
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Math trail */}
                <p style={{
                    fontSize: "9px", color: "rgba(255,255,255,0.18)",
                    marginTop: "10px", fontFamily: "monospace", letterSpacing: "0.04em",
                }}>
                    {baseRisk} + {dexRiskImpact} + {burstPenalty} − {stableMitigation}
                    {crossChainImpact > 0 ? ` − ${crossChainImpact}` : ""}{" "}
                    = <span style={{ color: riskColor, fontWeight: 700 }}>{finalRisk}</span>
                </p>
            </div>

            {/* ── Alert badges ── */}
            {alerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {alerts.map((alert, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "9px 14px", borderRadius: "8px",
                            background: alert.severity === "critical" ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
                            border: `1px solid ${alert.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                        }}>
                            <span style={{ fontSize: "14px", flexShrink: 0 }}>{alert.icon}</span>
                            <span style={{
                                fontSize: "11px", lineHeight: 1.4,
                                color: alert.severity === "critical" ? "rgba(239,68,68,0.9)" : "rgba(245,158,11,0.9)",
                            }}>
                                {alert.text}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}