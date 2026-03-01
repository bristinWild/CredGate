"use client";
import { useEffect, useState } from "react";

interface LendingHistoryProps {
    totalBorrows?: number;
    totalRepays?: number;
    borrowRepayCycles?: number;
    repayRatio?: number;
    liquidations?: number;
    liquidationRate?: number;
    lendingScoreContribution?: number;
    lendingScoreMax?: number;
    activeChains?: string[];
}

function buildMonthlyData(borrows: number, repays: number) {
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    const weights = [0.12, 0.18, 0.22, 0.20, 0.16, 0.12];
    return months.map((m, i) => ({
        month: m,
        borrows: Math.round(borrows * weights[i]),
        repays: Math.round(repays * weights[i]),
    }));
}

function buildCycleTimeline(cycles: number) {
    const pts: { x: number; type: "borrow" | "repay" }[] = [];
    const W = 400;
    for (let i = 0; i < Math.min(cycles, 60); i++) {
        const x = (i / Math.min(cycles, 60)) * W;
        const noise = Math.sin(i * 1.3) * 8;
        pts.push({ x, type: "borrow" });
        pts.push({ x: x + 2 + Math.abs(noise), type: "repay" });
    }
    return pts;
}

function ShieldIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7L12 2z"
                fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

interface TooltipState { visible: boolean; x: number; y: number; label: string; borrows: number; repays: number }

export default function LendingHistoryCard({
    totalBorrows = 170,
    totalRepays = 209,
    borrowRepayCycles = 170,
    repayRatio = 1.23,
    liquidations = 0,
    liquidationRate = 0,
    lendingScoreContribution = 40,
    lendingScoreMax = 40,
    activeChains = ["ethereum"],
}: LendingHistoryProps) {
    const [animated, setAnimated] = useState(false);
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, label: "", borrows: 0, repays: 0 });

    useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

    const monthly = buildMonthlyData(totalBorrows, totalRepays);
    const cyclePoints = buildCycleTimeline(borrowRepayCycles);
    const maxMonthly = Math.max(...monthly.map(m => Math.max(m.borrows, m.repays)), 1);
    const lendingPct = (lendingScoreContribution / lendingScoreMax) * 100;

    // ── Derived dynamic values ──────────────────────────────────────────────
    const isHealthy = liquidations === 0 && repayRatio >= 1;
    const borrowerStatus = isHealthy
        ? "Healthy Borrower"
        : liquidations > 0
            ? "Risky Borrower"
            : "Borderline Borrower";
    const borrowerStatusColor = isHealthy ? "#34d399" : "#ef4444";
    const borrowerStatusBg = isHealthy ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)";
    const borrowerStatusBorder = isHealthy ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)";

    const lendingScoreLabel =
        lendingPct === 100
            ? "Maximum Lending Trust Score Achieved"
            : lendingPct >= 50
                ? "Strong Lending Contribution"
                : "Partial Lending Score";

    // Bar chart dimensions
    const BAR_W = 52, BAR_GAP = 4, GROUP_GAP = 16;
    const CHART_H = 120, CHART_PAD = 24;
    const groupW = BAR_W * 2 + BAR_GAP + GROUP_GAP;
    const CHART_W = monthly.length * groupW + CHART_PAD * 2;

    return (
        <div
            className="dashboardCard"
            style={{ display: "flex", flexDirection: "column", gap: "22px", position: "relative", overflow: "hidden" }}
        >
            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 70% 50% at 10% 30%, rgba(52,211,153,0.04) 0%, transparent 70%)",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        LENDING HISTORY · AAVE ACTIVITY
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ShieldIcon size={22} />
                        <span style={{ fontSize: "20px", fontWeight: 800, color: borrowerStatusColor }}>
                            {borrowerStatus}
                        </span>
                    </div>
                </div>
                <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "999px",
                    background: borrowerStatusBg,
                    border: `1px solid ${borrowerStatusBorder}`,
                }}>
                    <span style={{ fontSize: "14px" }}>{isHealthy ? "🟢" : "🔴"}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: borrowerStatusColor, letterSpacing: "0.08em" }}>
                        ACTIVE CHAINS: {activeChains.length}
                    </span>
                </div>
            </div>

            {/* ── Primary metric grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px" }}>
                {[
                    { label: "Total Borrows", value: totalBorrows, color: "#60a5fa" },
                    { label: "Total Repays", value: totalRepays, color: "#34d399" },
                    { label: "Cycles", value: borrowRepayCycles, color: "#4ef2e8" },
                    { label: "Repay Ratio", value: repayRatio.toFixed(2), color: repayRatio >= 1 ? "#34d399" : "#ef4444", highlight: true },
                    { label: "Liquidations", value: liquidations, color: liquidations === 0 ? "#4ef2e8" : "#ef4444" },
                    { label: "Liquidation Rate", value: `${(liquidationRate * 100).toFixed(1)}%`, color: liquidationRate === 0 ? "#4ef2e8" : "#ef4444" },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: "12px 10px", borderRadius: "10px", textAlign: "center",
                        background: s.highlight ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${s.highlight ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                        <p style={{ fontSize: "8px", color: "var(--color-muted)", letterSpacing: "0.07em", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontSize: "20px", fontWeight: 800, color: s.color, fontFamily: "monospace", lineHeight: 1 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Charts row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

                {/* Bar chart: Borrow vs Repay */}
                <div>
                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                        BORROW VS REPAY · MONTHLY
                    </p>
                    <div style={{ position: "relative", overflow: "visible" }}>
                        <svg
                            viewBox={`0 0 ${CHART_W} ${CHART_H + CHART_PAD}`}
                            style={{ width: "100%", height: "auto", overflow: "visible" }}
                        >
                            {[0.25, 0.5, 0.75, 1].map(r => (
                                <line key={r}
                                    x1={CHART_PAD} y1={CHART_H - r * CHART_H}
                                    x2={CHART_W - CHART_PAD} y2={CHART_H - r * CHART_H}
                                    stroke="rgba(255,255,255,0.04)" strokeWidth="1"
                                />
                            ))}

                            {monthly.map((m, i) => {
                                const gx = CHART_PAD + i * groupW;
                                const bH = animated ? (m.borrows / maxMonthly) * CHART_H : 0;
                                const rH = animated ? (m.repays / maxMonthly) * CHART_H : 0;

                                return (
                                    <g key={m.month}
                                        onMouseEnter={() => setTooltip({ visible: true, x: gx + groupW / 2, y: CHART_H - Math.max(bH, rH) - 20, label: m.month, borrows: m.borrows, repays: m.repays })}
                                        onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                                        style={{ cursor: "crosshair" }}
                                    >
                                        <rect x={gx} y={CHART_H - bH} width={BAR_W} height={bH} rx="3"
                                            fill="rgba(96,165,250,0.7)"
                                            style={{ transition: `height 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s, y 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s` }}
                                        />
                                        <rect x={gx + BAR_W + BAR_GAP} y={CHART_H - rH} width={BAR_W} height={rH} rx="3"
                                            fill="rgba(52,211,153,0.7)"
                                            style={{ transition: `height 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.06 + 0.05}s, y 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 0.06 + 0.05}s` }}
                                        />
                                        <text x={gx + BAR_W} y={CHART_H + 14} textAnchor="middle"
                                            fill="rgba(255,255,255,0.3)" fontSize="9">
                                            {m.month}
                                        </text>
                                    </g>
                                );
                            })}

                            {tooltip.visible && (
                                <g>
                                    <rect x={tooltip.x - 44} y={tooltip.y - 36} width={88} height={48}
                                        rx="6" fill="rgba(10,14,20,0.97)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                                    <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">{tooltip.label}</text>
                                    <text x={tooltip.x - 8} y={tooltip.y - 4} textAnchor="end" fill="#60a5fa" fontSize="9" fontFamily="monospace">B:{tooltip.borrows}</text>
                                    <text x={tooltip.x + 8} y={tooltip.y - 4} textAnchor="start" fill="#34d399" fontSize="9" fontFamily="monospace">R:{tooltip.repays}</text>
                                </g>
                            )}
                        </svg>

                        <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                            {[{ color: "#60a5fa", label: "Borrows" }, { color: "#34d399", label: "Repays" }].map(l => (
                                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: l.color }} />
                                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cycle timeline */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em" }}>
                            BORROW–REPAY CYCLE FLOW
                        </p>
                        <span style={{ fontSize: "9px", color: "#34d399", fontWeight: 700 }}>
                            {borrowRepayCycles} completed cycles
                        </span>
                    </div>
                    <svg viewBox="0 0 400 120" style={{ width: "100%", height: "120px" }}>
                        <defs>
                            <linearGradient id="borrowLine" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
                            </linearGradient>
                            <linearGradient id="repayLine" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
                            </linearGradient>
                        </defs>

                        {[30, 60, 90].map(y => (
                            <line key={y} x1="0" y1={y} x2="400" y2={y}
                                stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        ))}

                        {cyclePoints.filter(p => p.type === "borrow").map((p, i) => (
                            <circle key={i} cx={p.x} cy={animated ? 40 + Math.sin(i * 0.7) * 12 : 60}
                                r="2" fill="#60a5fa" opacity={animated ? 0.7 : 0}
                                style={{ transition: `all ${0.6 + i * 0.005}s ease` }}
                            />
                        ))}

                        {cyclePoints.filter(p => p.type === "repay").map((p, i) => (
                            <circle key={i} cx={p.x} cy={animated ? 75 + Math.cos(i * 0.9) * 10 : 60}
                                r="2" fill="#34d399" opacity={animated ? 0.7 : 0}
                                style={{ transition: `all ${0.7 + i * 0.005}s ease` }}
                            />
                        ))}

                        <line x1="0" y1="40" x2="400" y2="38" stroke="url(#borrowLine)" strokeWidth="1.5"
                            opacity={animated ? 0.6 : 0} style={{ transition: "opacity 1s ease 0.5s" }} />
                        <line x1="0" y1="75" x2="400" y2="73" stroke="url(#repayLine)" strokeWidth="1.5"
                            opacity={animated ? 0.6 : 0} style={{ transition: "opacity 1s ease 0.6s" }} />

                        <text x="200" y="110" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" letterSpacing="0.5">
                            Timeline: Last 6 months  ·  Blue = Borrows  ·  Green = Repays
                        </text>
                    </svg>
                </div>
            </div>

            {/* ── Risk indicators ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {[
                    {
                        icon: liquidations === 0 ? "🛡" : "⚠",
                        label: liquidations === 0 ? "No Liquidation History" : `${liquidations} Liquidation${liquidations !== 1 ? "s" : ""} Detected`,
                        sub: liquidations === 0
                            ? `0 liquidation events across all chains`
                            : `${liquidations} liquidation event(s) — elevated risk flag`,
                        color: liquidations === 0 ? "#34d399" : "#ef4444",
                        bg: liquidations === 0 ? "rgba(52,211,153,0.06)" : "rgba(239,68,68,0.06)",
                        border: liquidations === 0 ? "rgba(52,211,153,0.2)" : "rgba(239,68,68,0.2)",
                    },
                    {
                        icon: "📊",
                        label: `Repay Ratio: ${repayRatio.toFixed(2)}`,
                        sub: repayRatio >= 1
                            ? "Repays consistently exceed borrows"
                            : "Repays fall short of borrows — risk flag",
                        color: repayRatio >= 1 ? "#4ef2e8" : "#ef4444",
                        bg: repayRatio >= 1 ? "rgba(78,242,232,0.06)" : "rgba(239,68,68,0.06)",
                        border: repayRatio >= 1 ? "rgba(78,242,232,0.2)" : "rgba(239,68,68,0.2)",
                    },
                    {
                        icon: liquidations === 0 ? "✅" : "⚠",
                        label: `${liquidations} Over-Borrow Event${liquidations !== 1 ? "s" : ""}`,
                        sub: liquidations === 0
                            ? "No over-collateral risk detected"
                            : `${liquidations} liquidation(s) flagged — elevated risk`,
                        color: liquidations === 0 ? "#818cf8" : "#ef4444",
                        bg: liquidations === 0 ? "rgba(129,140,248,0.06)" : "rgba(239,68,68,0.06)",
                        border: liquidations === 0 ? "rgba(129,140,248,0.2)" : "rgba(239,68,68,0.2)",
                    },
                ].map(r => (
                    <div key={r.label} style={{
                        padding: "12px 14px", borderRadius: "10px",
                        background: r.bg, border: `1px solid ${r.border}`,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                            <span style={{ fontSize: "14px" }}>{r.icon}</span>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: r.color }}>{r.label}</span>
                        </div>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>{r.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Behavioral summary ── */}
            <div style={{
                padding: "14px 16px", borderRadius: "10px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${borrowerStatusColor}`,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <div style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: borrowerStatusColor,
                        boxShadow: `0 0 6px ${borrowerStatusColor}`,
                    }} />
                    <span style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.1em" }}>
                        BEHAVIORAL ANALYSIS
                    </span>
                </div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 }}>
                    This wallet demonstrates{" "}
                    <span style={{ color: borrowerStatusColor, fontWeight: 600 }}>
                        {isHealthy ? "consistent short-cycle borrowing" : "irregular borrowing behaviour"}
                    </span>
                    {" "}with {isHealthy ? "full repayment discipline" : "repayment concerns"}.{" "}
                    {liquidations === 0
                        ? "No liquidation events detected across"
                        : `${liquidations} liquidation event(s) detected across`}{" "}
                    <span style={{ color: "#4ef2e8", fontWeight: 600 }}>{borrowRepayCycles} completed debt cycles</span>.
                    {" "}Repay ratio of{" "}
                    <span style={{ color: repayRatio >= 1 ? "#34d399" : "#ef4444", fontWeight: 600 }}>
                        {repayRatio.toFixed(2)}x
                    </span>
                    {" "}{repayRatio >= 1
                        ? "indicates capital returned consistently exceeds borrowed amount."
                        : "indicates capital returned falls short of borrowed amount."}{" "}
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        {lendingPct === 100 ? "High lending maturity score." : "Partial lending maturity score."}
                    </span>
                </p>
            </div>

            {/* ── Lending score contribution ── */}
            <div style={{
                padding: "14px 16px", borderRadius: "10px",
                background: "rgba(52,211,153,0.04)",
                border: "1px solid rgba(52,211,153,0.18)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div>
                        <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "3px" }}>
                            LENDING SCORE CONTRIBUTION
                        </p>
                        <p style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                            {lendingScoreLabel}
                        </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "24px", fontWeight: 800, color: "#34d399", fontFamily: "monospace" }}>
                            {lendingScoreContribution}
                        </span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}> / {lendingScoreMax}</span>
                    </div>
                </div>
                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                        height: "100%",
                        width: animated ? `${lendingPct}%` : "0%",
                        background: "linear-gradient(90deg, #34d399, #4ef2e8)",
                        borderRadius: "4px",
                        boxShadow: "0 0 12px rgba(52,211,153,0.5)",
                        transition: "width 1.4s cubic-bezier(0.4,0,0.2,1) 0.5s",
                    }} />
                </div>
                {lendingPct === 100 && (
                    <p style={{ fontSize: "10px", color: "rgba(52,211,153,0.6)", marginTop: "6px" }}>
                        ✓ Full {lendingScoreMax} points awarded — perfect lending track record
                    </p>
                )}
            </div>
        </div>
    );
}