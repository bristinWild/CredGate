"use client";
import { useEffect, useState } from "react";

interface ChainDetail {
    chain: string;
    txCount: number;
    walletAgeDays?: number | null;
}

interface CrossChainIntelligenceProps {
    chainsUsedCount?: number;
    activeChains?: string[];
    totalTxAcrossChains?: number;
    crossChainMaturityScore?: number;
    chainDetails?: ChainDetail[];
}

const CHAIN_META: Record<string, { color: string; glow: string; symbol: string }> = {
    ethereum: { color: "#818cf8", glow: "rgba(129,140,248,0.4)", symbol: "Ξ" },
    arbitrum: { color: "#60a5fa", glow: "rgba(96,165,250,0.4)", symbol: "A" },
    optimism: { color: "#f87171", glow: "rgba(248,113,113,0.4)", symbol: "O" },
    base: { color: "#4ef2e8", glow: "rgba(78,242,232,0.4)", symbol: "B" },
    polygon: { color: "#a78bfa", glow: "rgba(167,139,250,0.4)", symbol: "P" },
};

const DEFAULT_CHAINS: ChainDetail[] = [
    { chain: "ethereum", txCount: 7451 },
    { chain: "arbitrum", txCount: 0 },
    { chain: "optimism", txCount: 0 },
    { chain: "base", txCount: 0 },
    { chain: "polygon", txCount: 0 },
];

export default function CrossChainIntelligence({
    chainsUsedCount = 1,
    activeChains = ["ethereum"],
    totalTxAcrossChains = 7451,
    crossChainMaturityScore = 40,
    chainDetails = DEFAULT_CHAINS,
}: CrossChainIntelligenceProps) {
    const [animated, setAnimated] = useState(false);
    const [hoveredChain, setHoveredChain] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 200);
        return () => clearTimeout(t);
    }, []);

    const maxTx = Math.max(...chainDetails.map(c => c.txCount), 1);

    const scoreColor =
        crossChainMaturityScore >= 70 ? "#4ef2e8" :
            crossChainMaturityScore >= 40 ? "#f59e0b" : "#ef4444";

    const isSingleChain = chainsUsedCount <= 1;

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 50% at 20% 80%, rgba(129,140,248,0.04) 0%, transparent 70%)",
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        CROSS-CHAIN INTELLIGENCE
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                        <span style={{ fontSize: "32px", fontWeight: 800, fontFamily: "monospace", color: scoreColor, lineHeight: 1 }}>
                            {crossChainMaturityScore}
                        </span>
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>/ 100 maturity</span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                    {/* Chains used pill */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "5px 12px", borderRadius: "999px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: scoreColor, fontFamily: "monospace" }}>
                            {chainsUsedCount}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                            CHAIN{chainsUsedCount !== 1 ? "S" : ""} ACTIVE
                        </span>
                    </div>

                    {/* Single-chain warning */}
                    {isSingleChain && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "4px 10px", borderRadius: "6px",
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.25)",
                        }}>
                            <span style={{ fontSize: "11px" }}>⚠</span>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>
                                SINGLE-CHAIN EXPOSURE
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stats row ── */}
            <div style={{ display: "flex", gap: "12px" }}>
                {[
                    { label: "Total TXs", value: totalTxAcrossChains.toLocaleString() },
                    { label: "Active Chains", value: chainsUsedCount },
                    { label: "Primary Chain", value: activeChains[0] ? activeChains[0].charAt(0).toUpperCase() + activeChains[0].slice(1) : "—" },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: 1, padding: "10px 12px", borderRadius: "8px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        textAlign: "center",
                    }}>
                        <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.07em", marginBottom: "4px" }}>{s.label}</p>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Bar chart: chain vs txCount ── */}
            <div>
                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    TX DISTRIBUTION ACROSS CHAINS
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {chainDetails.map((c, i) => {
                        const meta = CHAIN_META[c.chain] ?? { color: "#94a3b8", glow: "rgba(148,163,184,0.3)", symbol: "?" };
                        const pct = (c.txCount / maxTx) * 100;
                        const isActive = c.txCount > 0;
                        const isHovered = hoveredChain === c.chain;

                        return (
                            <div
                                key={c.chain}
                                onMouseEnter={() => setHoveredChain(c.chain)}
                                onMouseLeave={() => setHoveredChain(null)}
                                style={{ cursor: isActive ? "default" : "not-allowed" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                                    {/* Chain symbol bubble */}
                                    <div style={{
                                        width: "24px", height: "24px", borderRadius: "6px",
                                        background: isActive ? `${meta.color}18` : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${isActive ? meta.color + "44" : "rgba(255,255,255,0.06)"}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "11px", fontWeight: 700,
                                        color: isActive ? meta.color : "rgba(255,255,255,0.15)",
                                        flexShrink: 0,
                                        transition: "all 0.2s",
                                    }}>
                                        {meta.symbol}
                                    </div>

                                    {/* Chain name */}
                                    <span style={{
                                        fontSize: "11px", fontWeight: isActive ? 600 : 400,
                                        color: isActive ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)",
                                        textTransform: "capitalize", flex: 1,
                                    }}>
                                        {c.chain}
                                    </span>

                                    {/* TX count */}
                                    <span style={{
                                        fontSize: "12px", fontWeight: 700, fontFamily: "monospace",
                                        color: isActive ? meta.color : "rgba(255,255,255,0.15)",
                                    }}>
                                        {c.txCount > 0 ? c.txCount.toLocaleString() : "—"}
                                    </span>
                                </div>

                                {/* Bar */}
                                <div style={{
                                    height: "7px",
                                    background: "rgba(255,255,255,0.04)",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                    marginLeft: "34px",
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: animated ? (isActive ? `${pct}%` : "0%") : "0%",
                                        background: isActive
                                            ? `linear-gradient(90deg, ${meta.color}cc, ${meta.color})`
                                            : "transparent",
                                        borderRadius: "4px",
                                        boxShadow: isActive && (isHovered || pct === 100) ? `0 0 12px ${meta.glow}` : "none",
                                        transition: `width 1.3s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s, box-shadow 0.2s`,
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Maturity score bar ── */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em" }}>
                        CROSS-CHAIN MATURITY
                    </p>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: scoreColor }}>{crossChainMaturityScore} / 100</span>
                </div>
                <div style={{ height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                        height: "100%",
                        width: animated ? `${crossChainMaturityScore}%` : "0%",
                        background: `linear-gradient(90deg, ${scoreColor}99, ${scoreColor})`,
                        borderRadius: "4px",
                        boxShadow: `0 0 10px ${scoreColor}55`,
                        transition: "width 1.4s cubic-bezier(0.4,0,0.2,1) 0.3s",
                    }} />
                </div>
            </div>

            {/* ── Info note ── */}

            <div style={{
                padding: "10px 14px", borderRadius: "8px",
                background: isSingleChain ? "rgba(245,158,11,0.06)" : "rgba(78,242,232,0.06)",
                border: `1px solid ${isSingleChain ? "rgba(245,158,11,0.18)" : "rgba(78,242,232,0.18)"}`,
            }}>
                <p style={{ fontSize: "11px", color: isSingleChain ? "rgba(245,158,11,0.85)" : "rgba(78,242,232,0.85)", lineHeight: 1.6, margin: 0 }}>
                    {isSingleChain ? (
                        <>
                            <span style={{ fontWeight: 700 }}>Single-chain exposure detected.</span>{" "}
                            Wallet activity is entirely concentrated on {activeChains[0] ? activeChains[0].charAt(0).toUpperCase() + activeChains[0].slice(1) : "one chain"}.
                            Diversification across {["arbitrum", "optimism", "base", "polygon"].filter(c => !activeChains.includes(c)).slice(0, 3).join(", ")} would significantly improve the cross-chain maturity score.
                        </>
                    ) : (
                        <>
                            <span style={{ fontWeight: 700 }}>Multi-chain activity detected.</span>{" "}
                            Wallet is active across {chainsUsedCount} chains: {activeChains.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}.
                            Cross-chain diversification positively contributes to the credit profile.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}