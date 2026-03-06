"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Navbar from "@/app/components/Navbar/Navbar";

type Step = "form" | "loading" | "success" | "already_exists";

interface KeyResult {
    id: string;
    key: string;
    name: string;
    createdAt: string;
}

export default function GetApiKeyPage() {
    const { address, isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [name, setName] = useState("");
    const [step, setStep] = useState<Step>("form");
    const [result, setResult] = useState<KeyResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

    async function handleGenerate() {
        if (!address || !name.trim()) return;
        setStep("loading");
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api-keys/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), walletAddress: address }),
            });

            const data = await res.json();

            if (res.status === 409) {
                setStep("already_exists");
                return;
            }

            if (!res.ok) {
                throw new Error(data.message ?? "Failed to generate key");
            }

            setResult(data);
            setStep("success");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setStep("form");
        }
    }

    function copyKey() {
        if (!result?.key) return;
        navigator.clipboard.writeText(result.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0a0a0f",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'DM Mono', 'Fira Code', monospace",
        }}>
            {/* Background glow */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(78,242,232,0.06) 0%, transparent 70%)",
            }} />

            {/* Navbar */}
            <Navbar />

            {/* Page content */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "48px", position: "relative" }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "6px 14px", borderRadius: "20px",
                        background: "rgba(78,242,232,0.08)",
                        border: "1px solid rgba(78,242,232,0.2)",
                        marginBottom: "20px",
                    }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ef2e8", boxShadow: "0 0 8px #4ef2e8" }} />
                        <span style={{ fontSize: "11px", color: "#4ef2e8", letterSpacing: "0.1em" }}>CREDGATE API ACCESS</span>
                    </div>

                    <h1 style={{
                        fontSize: "clamp(28px, 5vw, 42px)",
                        fontWeight: 700,
                        color: "#fff",
                        margin: "0 0 12px",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                    }}>
                        Get your API key
                    </h1>
                    <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", margin: 0, maxWidth: "400px" }}>
                        Connect your wallet to generate a key and start integrating CredGate into your app.
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    width: "100%", maxWidth: "480px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "20px",
                    padding: "32px",
                    position: "relative",
                    overflow: "hidden",
                }}>
                    {/* Card top accent */}
                    <div style={{
                        position: "absolute", top: 0, left: "10%", right: "10%", height: "1px",
                        background: "linear-gradient(90deg, transparent, rgba(78,242,232,0.4), transparent)",
                    }} />

                    {!isConnected ? (
                        // ── Not connected ─────────────────────────────────────────────
                        <div style={{ textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "16px",
                                background: "rgba(78,242,232,0.08)",
                                border: "1px solid rgba(78,242,232,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ef2e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                    <path d="M2 10h20" />
                                    <circle cx="17" cy="15" r="1.5" fill="#4ef2e8" stroke="none" />
                                </svg>
                            </div>

                            <div>
                                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "15px", fontWeight: 600, margin: "0 0 6px" }}>
                                    Connect your wallet
                                </p>
                                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0, lineHeight: 1.6 }}>
                                    You need a connected wallet to generate an API key.
                                </p>
                            </div>

                            <button
                                onClick={openConnectModal}
                                style={{
                                    width: "100%",
                                    padding: "13px",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(78,242,232,0.3)",
                                    background: "rgba(78,242,232,0.08)",
                                    color: "#4ef2e8",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    fontFamily: "inherit",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    letterSpacing: "0.02em",
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(78,242,232,0.14)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(78,242,232,0.5)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(78,242,232,0.1)";
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(78,242,232,0.08)";
                                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(78,242,232,0.3)";
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                                }}
                            >
                                Connect Wallet
                            </button>
                        </div>

                    ) : step === "form" ? (
                        // ── Form ──────────────────────────────────────────────────────
                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "10px 14px", borderRadius: "10px",
                                background: "rgba(78,242,232,0.06)",
                                border: "1px solid rgba(78,242,232,0.12)",
                            }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ef2e8", flexShrink: 0 }} />
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                                <span style={{ fontSize: "11px", color: "rgba(78,242,232,0.6)", marginLeft: "auto" }}>connected</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                                    PROJECT NAME
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && name.trim() && handleGenerate()}
                                    placeholder="e.g. my-defi-app"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "10px",
                                        padding: "12px 16px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        outline: "none",
                                        transition: "border-color 0.2s",
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "rgba(78,242,232,0.4)"}
                                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                                />
                            </div>

                            {error && (
                                <div style={{
                                    padding: "10px 14px", borderRadius: "8px",
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    fontSize: "12px", color: "rgba(239,68,68,0.9)",
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={!name.trim()}
                                style={{
                                    padding: "14px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: name.trim()
                                        ? "linear-gradient(135deg, #4ef2e8, #22d3ee)"
                                        : "rgba(255,255,255,0.06)",
                                    color: name.trim() ? "#0a0a0f" : "rgba(255,255,255,0.2)",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    fontFamily: "inherit",
                                    cursor: name.trim() ? "pointer" : "not-allowed",
                                    transition: "all 0.2s",
                                    letterSpacing: "0.04em",
                                }}
                            >
                                Generate API Key →
                            </button>

                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", margin: 0 }}>
                                One key per wallet address · 100 requests/min rate limit
                            </p>
                        </div>

                    ) : step === "loading" ? (
                        // ── Loading ───────────────────────────────────────────────────
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <div style={{
                                width: "40px", height: "40px", margin: "0 auto 20px",
                                border: "2px solid rgba(78,242,232,0.15)",
                                borderTopColor: "#4ef2e8",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                            }} />
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: 0 }}>
                                Generating your key...
                            </p>
                        </div>

                    ) : step === "already_exists" ? (
                        // ── Already has key ───────────────────────────────────────────
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚠️</div>
                            <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>
                                Key already exists
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: "0 0 24px" }}>
                                This wallet already has an API key. If you've lost it, contact support to rotate it.
                            </p>
                            <button
                                onClick={() => setStep("form")}
                                style={{
                                    padding: "10px 20px", borderRadius: "10px",
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "rgba(255,255,255,0.6)", fontSize: "13px",
                                    fontFamily: "inherit", cursor: "pointer",
                                }}
                            >
                                ← Back
                            </button>
                        </div>

                    ) : step === "success" && result ? (
                        // ── Success ───────────────────────────────────────────────────
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{
                                    width: "32px", height: "32px", borderRadius: "50%",
                                    background: "rgba(78,242,232,0.12)",
                                    border: "1px solid rgba(78,242,232,0.3)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "14px", flexShrink: 0,
                                }}>✓</div>
                                <div>
                                    <p style={{ color: "#fff", fontSize: "14px", fontWeight: 600, margin: 0 }}>
                                        Key generated for <span style={{ color: "#4ef2e8" }}>{result.name}</span>
                                    </p>
                                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: 0 }}>
                                        {new Date(result.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                background: "rgba(0,0,0,0.4)",
                                border: "1px solid rgba(78,242,232,0.2)",
                                borderRadius: "12px",
                                padding: "16px",
                            }}>
                                <p style={{ fontSize: "10px", color: "rgba(78,242,232,0.6)", margin: "0 0 8px", letterSpacing: "0.1em" }}>
                                    YOUR API KEY
                                </p>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <code style={{ fontSize: "12px", color: "#4ef2e8", wordBreak: "break-all", flex: 1, lineHeight: 1.5 }}>
                                        {result.key}
                                    </code>
                                    <button
                                        onClick={copyKey}
                                        style={{
                                            padding: "8px 14px", borderRadius: "8px", border: "none",
                                            background: copied ? "rgba(78,242,232,0.15)" : "rgba(78,242,232,0.08)",
                                            color: copied ? "#4ef2e8" : "rgba(255,255,255,0.5)",
                                            fontSize: "11px", fontFamily: "inherit",
                                            cursor: "pointer", flexShrink: 0,
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                padding: "10px 14px", borderRadius: "8px",
                                background: "rgba(245,158,11,0.06)",
                                border: "1px solid rgba(245,158,11,0.15)",
                                display: "flex", gap: "10px", alignItems: "flex-start",
                            }}>
                                <span style={{ fontSize: "13px", flexShrink: 0 }}>⚠️</span>
                                <p style={{ fontSize: "12px", color: "rgba(245,158,11,0.8)", margin: 0, lineHeight: 1.5 }}>
                                    This key will not be shown again. Copy it now and store it securely.
                                </p>
                            </div>

                            <div style={{
                                background: "rgba(0,0,0,0.3)",
                                borderRadius: "10px", padding: "14px",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}>
                                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "0 0 8px", letterSpacing: "0.08em" }}>
                                    QUICK START
                                </p>
                                <code style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", display: "block", lineHeight: 1.8 }}>
                                    <span style={{ color: "rgba(78,242,232,0.6)" }}>import</span>{" "}
                                    {"{ CredGateClient }"}{" "}
                                    <span style={{ color: "rgba(78,242,232,0.6)" }}>from</span>{" "}
                                    <span style={{ color: "rgba(165,243,252,0.7)" }}>'credgate-sdk'</span>
                                    <br /><br />
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>const</span> client ={" "}
                                    <span style={{ color: "rgba(165,243,252,0.7)" }}>new</span> CredGateClient({"{"}<br />
                                    {"  "}apiUrl: <span style={{ color: "rgba(165,243,252,0.7)" }}>'https://api.credgate.xyz'</span>,<br />
                                    {"  "}apiKey: <span style={{ color: "#4ef2e8" }}>'{result.key.slice(0, 20)}...'</span>,<br />
                                    {"}"})
                                </code>
                            </div>
                        </div>
                    ) : null}
                </div>

                <p style={{
                    marginTop: "24px", fontSize: "12px",
                    color: "rgba(255,255,255,0.2)", textAlign: "center",
                }}>
                    Rate limit: 100 req/min · Need help? Reach out on Discord
                </p>
            </div>
        </div>
    );
}