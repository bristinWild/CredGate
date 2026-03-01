"use client";
import { useEffect, useState } from "react";

interface OnChainStatusProps {
    status?: string;
    remainingSeconds?: number;
    txHash?: string;
    reportHash?: string;
    chainName?: string;
}

function formatTime(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return {
        hours: String(h).padStart(2, "0"),
        minutes: String(m).padStart(2, "0"),
        seconds: String(s).padStart(2, "0"),
    };
}

function EthereumIcon({ size = 24, color = "#818cf8" }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 20,12 12,16 4,12" fill={color} opacity="0.9" />
            <polygon points="12,16 20,12 12,22 4,12" fill={color} opacity="0.5" />
        </svg>
    );
}

function ChainLink() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// Circular countdown ring
function CooldownRing({ pct, remaining }: { pct: number; remaining: number }) {
    const R = 54, CX = 64, CY = 64;
    const CIRC = 2 * Math.PI * R;
    const offset = CIRC * (1 - pct);
    const { hours, minutes, seconds } = formatTime(remaining);

    const ringColor = pct > 0.6 ? "#f59e0b" : pct > 0.3 ? "#f97316" : "#ef4444";

    return (
        <svg width="128" height="128" viewBox="0 0 128 128">
            <defs>
                <linearGradient id="cooldownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <filter id="ringGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Track */}
            <circle cx={CX} cy={CY} r={R}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
            />

            {/* Progress arc */}
            <circle cx={CX} cy={CY} r={R}
                fill="none"
                stroke="url(#cooldownGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${CX} ${CY})`}
                filter="url(#ringGlow)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
            />

            {/* Tick marks */}
            {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const inner = R - 10, outer = R - 6;
                return (
                    <line key={i}
                        x1={CX + inner * Math.cos(rad)} y1={CY + inner * Math.sin(rad)}
                        x2={CX + outer * Math.cos(rad)} y2={CY + outer * Math.sin(rad)}
                        stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
                    />
                );
            })}

            {/* Center time display */}
            <text x={CX} y={CY - 10} textAnchor="middle" fill="white" fontSize="22" fontWeight="800" fontFamily="monospace">
                {hours}:{minutes}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill={ringColor} fontSize="14" fontWeight="700" fontFamily="monospace">
                :{seconds}
            </text>
            <text x={CX} y={CY + 26} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" letterSpacing="1.5">
                REMAINING
            </text>
        </svg>
    );
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
    COOLDOWN_ACTIVE: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", label: "COOLDOWN ACTIVE", icon: "⏳" },
    UPDATED: { color: "#4ef2e8", bg: "rgba(78,242,232,0.08)", border: "rgba(78,242,232,0.25)", label: "UPDATED", icon: "✅" },
    PENDING: { color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.25)", label: "PENDING", icon: "🔄" },
    FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "FAILED", icon: "❌" },
};

export default function OnChainStatusCard({
    status = "COOLDOWN_ACTIVE",
    remainingSeconds = 59241,
    txHash,
    reportHash,
    chainName = "ethereum",
}: OnChainStatusProps) {
    const [timeLeft, setTimeLeft] = useState(remainingSeconds);

    // Live countdown
    useEffect(() => {
        if (status !== "COOLDOWN_ACTIVE" || timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft(t => Math.max(0, t - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["COOLDOWN_ACTIVE"];
    const totalSeconds = remainingSeconds;
    const pct = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
    const { hours, minutes } = formatTime(timeLeft);
    const isCooldown = status === "COOLDOWN_ACTIVE";

    // Human-readable time left
    const hoursLeft = Math.floor(timeLeft / 3600);
    const minutesLeft = Math.floor((timeLeft % 3600) / 60);

    return (
        <div className="dashboardCard" style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", overflow: "hidden" }}>

            {/* Bg glow */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `radial-gradient(ellipse 60% 60% at 50% 0%, ${cfg.color}08 0%, transparent 70%)`,
            }} />

            {/* ── Header ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        ON-CHAIN STATUS
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Chain icon */}
                        <div style={{
                            width: "28px", height: "28px", borderRadius: "8px",
                            background: "rgba(129,140,248,0.12)",
                            border: "1px solid rgba(129,140,248,0.25)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <EthereumIcon size={16} color="#818cf8" />
                        </div>
                        <div>
                            <p style={{ fontSize: "12px", fontWeight: 700, color: "white", textTransform: "capitalize" }}>
                                {chainName}
                            </p>
                            <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                                MAINNET
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status badge */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "999px",
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                }}>
                    <span style={{ fontSize: "12px" }}>{cfg.icon}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: cfg.color, letterSpacing: "0.08em" }}>
                        {cfg.label}
                    </span>
                </div>
            </div>

            {/* ── Countdown + info ── */}
            {isCooldown ? (
                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>

                    {/* Ring */}
                    <div style={{ flexShrink: 0 }}>
                        <CooldownRing pct={pct} remaining={timeLeft} />
                    </div>

                    {/* Right info */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                                This wallet's on-chain credit report is under cooldown. A new analysis can be requested after the timer expires.
                            </p>
                        </div>

                        {/* Time breakdown */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            {[
                                { label: "Hours", value: String(hoursLeft).padStart(2, "0") },
                                { label: "Minutes", value: String(minutesLeft).padStart(2, "0") },
                            ].map(t => (
                                <div key={t.label} style={{
                                    flex: 1, padding: "10px", borderRadius: "8px",
                                    background: "rgba(245,158,11,0.06)",
                                    border: "1px solid rgba(245,158,11,0.15)",
                                    textAlign: "center",
                                }}>
                                    <p style={{ fontSize: "22px", fontWeight: 800, color: "#f59e0b", fontFamily: "monospace" }}>
                                        {t.value}
                                    </p>
                                    <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.08em", marginTop: "3px" }}>
                                        {t.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                <span style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.07em" }}>COOLDOWN PROGRESS</span>
                                <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>
                                    {((1 - pct) * 100).toFixed(1)}% elapsed
                                </span>
                            </div>
                            <div style={{ height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${(1 - pct) * 100}%`,
                                    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                                    borderRadius: "3px",
                                    boxShadow: "0 0 8px rgba(245,158,11,0.4)",
                                    transition: "width 1s linear",
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Non-cooldown status */
                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "12px", padding: "24px",
                    background: cfg.bg, borderRadius: "12px", border: `1px solid ${cfg.border}`,
                    textAlign: "center",
                }}>
                    <span style={{ fontSize: "36px" }}>{cfg.icon}</span>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                        On-chain report is current. No cooldown active.
                    </p>
                </div>
            )}

            {/* ── Hashes ── */}
            {(txHash || reportHash) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {[
                        { label: "TX Hash", value: txHash },
                        { label: "Report Hash", value: reportHash },
                    ].filter(h => h.value).map(h => (
                        <div key={h.label} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "8px 12px", borderRadius: "8px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                            <ChainLink />
                            <div style={{ flex: 1, overflow: "hidden" }}>
                                <p style={{ fontSize: "9px", color: "var(--color-muted)", letterSpacing: "0.06em", marginBottom: "2px" }}>
                                    {h.label}
                                </p>
                                <p style={{
                                    fontSize: "11px", color: "rgba(255,255,255,0.5)",
                                    fontFamily: "monospace", overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {h.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Cooldown note ── */}
            {isCooldown && (
                <div style={{
                    padding: "10px 14px", borderRadius: "8px",
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.15)",
                }}>
                    <p style={{ fontSize: "10px", color: "rgba(245,158,11,0.7)", lineHeight: 1.6, margin: 0 }}>
                        ⏳ Cooldown prevents re-analysis spam and ensures registry integrity.
                        Next analysis available in <strong style={{ color: "#f59e0b" }}>{hoursLeft}h {minutesLeft}m</strong>.
                    </p>
                </div>
            )}
        </div>
    );
}