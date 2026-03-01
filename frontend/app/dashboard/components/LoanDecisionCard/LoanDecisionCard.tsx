"use client";
import { useState } from "react";

interface LoanDecisionProps {
    recommendedLTV?: number;
    interestTier?: string;
    maxLoanSizeUSD?: number;
    collateralValueUSD?: number;
    walletCreditScore?: number;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH";
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
    REJECT: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "REJECTED" },
    PRIME: { color: "#4ef2e8", bg: "rgba(78,242,232,0.08)", border: "rgba(78,242,232,0.25)", label: "PRIME" },
    A: { color: "#4ef2e8", bg: "rgba(78,242,232,0.08)", border: "rgba(78,242,232,0.25)", label: "TIER A" },
    B: { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.25)", label: "TIER B" },
    C: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", label: "TIER C" },
};

function getRiskWarning(ltv: number, creditScore: number): { level: "safe" | "warn" | "danger"; lines: string[] } {
    if (ltv === 0) return { level: "safe", lines: [] };
    if (ltv <= 20) return {
        level: "warn",
        lines: [
            `At ${ltv}% LTV, liquidation risk is manageable but not recommended given credit score of ${creditScore}.`,
            "Lender exposure is low but underwriting guidelines require a minimum score of 40.",
        ],
    };
    if (ltv <= 40) return {
        level: "warn",
        lines: [
            `At ${ltv}% LTV, the position enters moderate liquidation risk territory.`,
            "Burst DEX activity and single-chain exposure increase collateral volatility risk.",
            "Recommended only with additional overcollateralization.",
        ],
    };
    if (ltv <= 65) return {
        level: "danger",
        lines: [
            `⚠ At ${ltv}% LTV, liquidation probability rises sharply given the current risk score.`,
            "High-frequency swap anomalies + funding concentration make this position highly speculative.",
            "Capital deployment at this LTV is not advisable without collateral diversification.",
        ],
    };
    return {
        level: "danger",
        lines: [
            `🔴 At ${ltv}% LTV, this wallet enters EXTREME liquidation risk.`,
            `The combination of single-chain exposure, burst DEX activity, and low credit score (${creditScore}/100) makes full liquidation likely under a 15% market drawdown.`,
            "Capital allocation at this LTV would be considered reckless by underwriting standards.",
        ],
    };
}

function simulatedLoan(ltv: number, collateral: number): number {
    return Math.round((ltv / 100) * collateral);
}

function simulatedInterestTier(ltv: number, creditScore: number): string {
    if (ltv === 0 || creditScore < 30) return "REJECT";
    if (ltv <= 20 && creditScore >= 60) return "B";
    if (ltv <= 40) return "C";
    return "REJECT";
}

const LTV_MARKS = [0, 20, 40, 60, 80];

export default function LoanDecisionCard({
    recommendedLTV = 0,
    interestTier = "REJECT",
    maxLoanSizeUSD = 0,
    collateralValueUSD = 18500,
    walletCreditScore = 21,
    riskLevel = "MEDIUM",
}: LoanDecisionProps) {
    const [simLTV, setSimLTV] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);

    const tier = TIER_CONFIG[interestTier] ?? TIER_CONFIG["REJECT"];
    const simLoan = simulatedLoan(simLTV, collateralValueUSD);
    const simTier = simulatedInterestTier(simLTV, walletCreditScore);
    const simTierCfg = TIER_CONFIG[simTier] ?? TIER_CONFIG["REJECT"];
    const warning = getRiskWarning(simLTV, walletCreditScore);

    // ── Dynamic decision header ─────────────────────────────────────────────
    const isApproved = interestTier !== "REJECT" && maxLoanSizeUSD > 0;
    const decisionIcon = isApproved ? "🟢" : "🔴";
    const decisionColor = isApproved ? "#4ef2e8" : "#ef4444";
    const decisionText = isApproved ? "CAPITAL ALLOCATION: APPROVED" : "CAPITAL ALLOCATION: REJECTED";

    const handleLTVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSimLTV(Number(e.target.value));
        setIsSimulating(Number(e.target.value) > 0);
    };

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: isSimulating
                    ? "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 70%)"
                    : isApproved
                        ? "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(78,242,232,0.04) 0%, transparent 70%)"
                        : "radial-gradient(ellipse 60% 60% at 80% 20%, rgba(239,68,68,0.04) 0%, transparent 70%)",
                transition: "background 0.5s ease",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        LOAN DECISION ENGINE
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "24px" }}>{decisionIcon}</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, color: decisionColor, letterSpacing: "0.04em" }}>
                            {decisionText}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Current decision tiles ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {[
                    { label: "Recommended LTV", value: `${recommendedLTV}%`, color: tier.color },
                    { label: "Interest Tier", value: interestTier, color: tier.color },
                    { label: "Max Loan Size", value: `$${maxLoanSizeUSD.toLocaleString()}`, color: tier.color },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: "12px 14px", borderRadius: "10px",
                        background: tier.bg,
                        border: `1px solid ${tier.border}`,
                        textAlign: "center",
                    }}>
                        <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "6px" }}>{s.label}</p>
                        <p style={{ fontSize: "18px", fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Divider ── */}
            <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                color: "rgba(255,255,255,0.2)", fontSize: "10px", letterSpacing: "0.1em",
            }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                CAPITAL SIMULATION
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* ── LTV Slider ── */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                        Simulate: What if LTV was{" "}
                        <span style={{
                            color: simLTV === 0 ? "rgba(255,255,255,0.4)" :
                                simLTV <= 40 ? "#f59e0b" : "#ef4444",
                            fontFamily: "monospace", fontWeight: 800, fontSize: "13px",
                        }}>
                            {simLTV}%
                        </span>
                        ?
                    </p>
                    {isSimulating && (
                        <button
                            onClick={() => { setSimLTV(0); setIsSimulating(false); }}
                            style={{
                                fontSize: "9px", color: "rgba(255,255,255,0.3)",
                                background: "none", border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "4px", padding: "3px 8px", cursor: "pointer",
                                letterSpacing: "0.06em",
                            }}
                        >
                            RESET
                        </button>
                    )}
                </div>

                {/* Slider track */}
                <div style={{ position: "relative", paddingBottom: "20px" }}>
                    <input
                        type="range"
                        min={0}
                        max={80}
                        step={5}
                        value={simLTV}
                        onChange={handleLTVChange}
                        style={{
                            width: "100%",
                            appearance: "none",
                            height: "6px",
                            borderRadius: "3px",
                            background: `linear-gradient(90deg,
                                ${simLTV <= 40 ? "#f59e0b" : "#ef4444"} 0%,
                                ${simLTV <= 40 ? "#f59e0b" : "#ef4444"} ${(simLTV / 80) * 100}%,
                                rgba(255,255,255,0.08) ${(simLTV / 80) * 100}%,
                                rgba(255,255,255,0.08) 100%)`,
                            cursor: "pointer",
                            outline: "none",
                            border: "none",
                        }}
                    />
                    {/* Marks */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                        {LTV_MARKS.map(m => (
                            <span key={m} style={{
                                fontSize: "9px", fontFamily: "monospace",
                                color: m <= simLTV
                                    ? (simLTV <= 40 ? "#f59e0b" : "#ef4444")
                                    : "rgba(255,255,255,0.2)",
                                fontWeight: m === simLTV ? 700 : 400,
                                transition: "color 0.2s",
                            }}>
                                {m}%
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Simulation result ── */}
            {isSimulating && (
                <div style={{
                    borderRadius: "12px",
                    border: `1px solid ${warning.level === "danger" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                    background: warning.level === "danger" ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
                    overflow: "hidden",
                }}>
                    {/* Result header */}
                    <div style={{
                        padding: "14px 16px",
                        borderBottom: `1px solid ${warning.level === "danger" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "12px",
                    }}>
                        {[
                            { label: "Simulated LTV", value: `${simLTV}%`, color: simLTV <= 40 ? "#f59e0b" : "#ef4444" },
                            { label: "Simulated Loan", value: `$${simLoan.toLocaleString()}`, color: simLTV <= 40 ? "#f59e0b" : "#ef4444" },
                            { label: "Simulated Tier", value: simTier, color: simTierCfg.color },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.07em", marginBottom: "5px" }}>{s.label}</p>
                                <p style={{ fontSize: "18px", fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Liquidation risk meter */}
                    <div style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em" }}>LIQUIDATION RISK</span>
                            <span style={{
                                fontSize: "10px", fontWeight: 700,
                                color: simLTV <= 20 ? "#f59e0b" : simLTV <= 40 ? "#f97316" : "#ef4444",
                            }}>
                                {simLTV <= 20 ? "MODERATE" : simLTV <= 40 ? "HIGH" : "EXTREME"}
                            </span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{
                                height: "100%",
                                width: `${Math.min((simLTV / 80) * 130, 100)}%`,
                                background: simLTV <= 40
                                    ? "linear-gradient(90deg, #f59e0b, #f97316)"
                                    : "linear-gradient(90deg, #f97316, #ef4444)",
                                borderRadius: "3px",
                                boxShadow: `0 0 10px ${simLTV > 40 ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.4)"}`,
                                transition: "width 0.4s ease, background 0.4s ease",
                            }} />
                        </div>

                        {/* Warning lines */}
                        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {warning.lines.map((line, i) => (
                                <p key={i} style={{
                                    fontSize: "11px",
                                    color: warning.level === "danger" ? "rgba(239,68,68,0.8)" : "rgba(245,158,11,0.8)",
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Idle state prompt ── */}
            {!isSimulating && (
                <div style={{
                    padding: "16px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed rgba(255,255,255,0.08)",
                    textAlign: "center",
                }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                        Move the slider above to simulate how capital allocation would change at different LTV ratios.
                    </p>
                </div>
            )}

            {/* ── Collateral note ── */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 14px", borderRadius: "8px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
            }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Estimated collateral used for simulation</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                    ${collateralValueUSD.toLocaleString()}
                </span>
            </div>

            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: white;
                    border: 3px solid #f59e0b;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(245,158,11,0.5);
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                input[type=range]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: white;
                    border: 3px solid #f59e0b;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(245,158,11,0.5);
                }
            `}</style>
        </div>
    );
}