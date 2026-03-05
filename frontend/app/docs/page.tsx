"use client";

import { useState } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
type Section = {
    id: string;
    label: string;
    icon: string;
};

// ── Sidebar sections ─────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "installation", label: "Installation", icon: "⬇" },
    { id: "quickstart", label: "Quick Start", icon: "⚡" },
    { id: "analyze", label: "analyzeWallet", icon: "◎" },
    { id: "score", label: "getScore", icon: "◐" },
    { id: "proof", label: "getProofStatus", icon: "◑" },
    { id: "creditline", label: "getCreditLine", icon: "◒" },
    { id: "webhooks", label: "Webhooks", icon: "◓" },
    { id: "errors", label: "Error Handling", icon: "△" },
    { id: "types", label: "TypeScript Types", icon: "⬡" },
];

// ── Code block component ──────────────────────────────────────────────────────
function CodeBlock({ code, lang = "typescript" }: { code: string; lang?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            position: "relative",
            borderRadius: "12px",
            border: "1px solid rgba(78,242,232,0.12)",
            background: "rgba(0,0,0,0.4)",
            overflow: "hidden",
            marginTop: "12px",
            marginBottom: "20px",
        }}>
            {/* Header bar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
            }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                    {lang}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        fontSize: "11px",
                        color: copied ? "#4ef2e8" : "rgba(255,255,255,0.35)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        letterSpacing: "0.06em",
                        transition: "color 0.2s",
                    }}
                >
                    {copied ? "✓ COPIED" : "COPY"}
                </button>
            </div>
            {/* Code */}
            <pre style={{
                margin: 0,
                padding: "20px",
                overflowX: "auto",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: "13px",
                lineHeight: "1.7",
                color: "rgba(255,255,255,0.85)",
            }}>
                <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
            </pre>
        </div>
    );
}

// ── Very lightweight syntax highlighter ──────────────────────────────────────
function highlightCode(code: string): string {
    return code
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // strings
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
            '<span style="color:#a5f3fc">$1</span>')
        // keywords
        .replace(/\b(import|from|export|const|let|var|async|await|return|new|if|else|throw|try|catch|type|interface|extends)\b/g,
            '<span style="color:#c084fc">$1</span>')
        // comments
        .replace(/(\/\/[^\n]*)/g, '<span style="color:rgba(255,255,255,0.3)">$1</span>')
        // numbers
        .replace(/\b(\d+)\b/g, '<span style="color:#fcd34d">$1</span>')
        // function calls
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
            '<span style="color:#4ef2e8">$1</span>(');
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            padding: "2px 8px",
            borderRadius: "4px",
            color,
            background: color + "18",
            border: `1px solid ${color}30`,
        }}>
            {label}
        </span>
    );
}

// ── Method signature ──────────────────────────────────────────────────────────
function MethodCard({ method, returns, desc, badge }: {
    method: string; returns: string; desc: string; badge?: string;
}) {
    return (
        <div style={{
            padding: "16px 20px",
            borderRadius: "10px",
            border: "1px solid rgba(78,242,232,0.15)",
            background: "rgba(78,242,232,0.03)",
            marginBottom: "12px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <code style={{ fontSize: "14px", color: "#4ef2e8", fontFamily: "monospace" }}>{method}</code>
                {badge && <Badge label={badge} color="#f59e0b" />}
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px 0" }}>
                Returns: <code style={{ color: "#a5f3fc", fontFamily: "monospace" }}>{returns}</code>
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0 }}>{desc}</p>
        </div>
    );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "white",
            marginTop: "52px",
            marginBottom: "6px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            scrollMarginTop: "80px",
        }}>
            {children}
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            marginTop: "28px",
            marginBottom: "8px",
        }}>
            {children}
        </h3>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: "14px",
            lineHeight: "1.8",
            color: "rgba(255,255,255,0.55)",
            margin: "8px 0",
        }}>
            {children}
        </p>
    );
}

function Param({ name, type, required, desc }: {
    name: string; type: string; required?: boolean; desc: string;
}) {
    return (
        <div style={{
            display: "flex",
            gap: "12px",
            padding: "10px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            alignItems: "flex-start",
        }}>
            <div style={{ minWidth: "160px", flexShrink: 0 }}>
                <code style={{ fontSize: "12px", color: "#4ef2e8", fontFamily: "monospace" }}>{name}</code>
                {required && <span style={{ color: "#f87171", fontSize: "10px", marginLeft: "4px" }}>*</span>}
            </div>
            <code style={{ fontSize: "11px", color: "#a5f3fc", fontFamily: "monospace", minWidth: "100px", flexShrink: 0 }}>{type}</code>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{desc}</span>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("overview");

    const scrollTo = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#060a0f",
            color: "white",
            fontFamily: "'JetBrains Mono', monospace",
        }}>
            {/* Navbar */}
            <nav style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(6,10,15,0.92)",
                backdropFilter: "blur(12px)",
                padding: "0 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: "56px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "white" }}>
                            Cred<span style={{ color: "#4ef2e8" }}>Gate</span>
                        </span>
                    </Link>
                    <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>SDK DOCS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <Link href="/dashboard" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                        Dashboard
                    </Link>
                    <Link href="/credlend" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                        CredLend
                    </Link>
                    <a
                        href="https://www.npmjs.com/package/credgate-sdk"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: "rgba(78,242,232,0.1)",
                            border: "1px solid rgba(78,242,232,0.3)",
                            color: "#4ef2e8",
                            textDecoration: "none",
                            letterSpacing: "0.04em",
                        }}
                    >
                        npm ↗
                    </a>
                </div>
            </nav>

            <div style={{ display: "flex", maxWidth: "1280px", margin: "0 auto" }}>

                {/* ── Sidebar ── */}
                <aside style={{
                    width: "220px",
                    flexShrink: 0,
                    position: "sticky",
                    top: "56px",
                    height: "calc(100vh - 56px)",
                    overflowY: "auto",
                    padding: "32px 0 32px 24px",
                    borderRight: "1px solid rgba(255,255,255,0.06)",
                }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", marginBottom: "12px" }}>
                        REFERENCE
                    </p>
                    {SECTIONS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => scrollTo(s.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                width: "100%",
                                padding: "7px 10px",
                                borderRadius: "7px",
                                border: "none",
                                background: activeSection === s.id ? "rgba(78,242,232,0.1)" : "transparent",
                                color: activeSection === s.id ? "#4ef2e8" : "rgba(255,255,255,0.4)",
                                fontSize: "12px",
                                fontFamily: "inherit",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.15s",
                                marginBottom: "2px",
                            }}
                        >
                            <span style={{ fontSize: "10px", opacity: 0.7 }}>{s.icon}</span>
                            {s.label}
                        </button>
                    ))}

                    {/* Version badge */}
                    <div style={{ marginTop: "32px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>VERSION</p>
                        <p style={{ fontSize: "13px", color: "#4ef2e8", fontFamily: "monospace", fontWeight: 700 }}>1.0.0</p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>credgate-sdk</p>
                    </div>
                </aside>

                {/* ── Main content ── */}
                <main style={{ flex: 1, padding: "40px 48px 80px 48px", maxWidth: "860px" }}>

                    {/* ── OVERVIEW ── */}
                    <div id="overview">
                        {/* Hero */}
                        <div style={{
                            padding: "32px",
                            borderRadius: "16px",
                            border: "1px solid rgba(78,242,232,0.2)",
                            background: "linear-gradient(135deg, rgba(78,242,232,0.05) 0%, rgba(0,0,0,0) 60%)",
                            marginBottom: "32px",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                <div style={{
                                    width: "40px", height: "40px", borderRadius: "10px",
                                    background: "rgba(78,242,232,0.12)",
                                    border: "1px solid rgba(78,242,232,0.3)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "20px",
                                }}>
                                    ◈
                                </div>
                                <div>
                                    <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                                        credgate-sdk
                                    </h1>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                                        On-chain credit scoring for any dApp
                                    </p>
                                </div>
                            </div>
                            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.8", margin: "0 0 16px 0" }}>
                                CredGate SDK lets you integrate wallet-based credit scoring into any application.
                                Analyze wallet history, fetch ZK-verified credit scores, and gate features by tier —
                                all backed by CreditCoin on-chain proofs.
                            </p>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <Badge label="TypeScript" color="#4ef2e8" />
                                <Badge label="ZK Proofs" color="#a78bfa" />
                                <Badge label="CreditCoin" color="#f59e0b" />
                                <Badge label="MIT License" color="#4ade80" />
                            </div>
                        </div>

                        {/* What it does */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                            {[
                                { icon: "◎", title: "Analyze wallets", desc: "Trigger off-chain analysis of any EVM wallet — lending history, DEX activity, chain maturity" },
                                { icon: "◐", title: "Fetch scores", desc: "Get structured credit scores (0–100) with tier classification and max loan sizing" },
                                { icon: "◑", title: "ZK Proof status", desc: "Track CreditCoin proof generation and on-chain submission in real-time" },
                                { icon: "◒", title: "Credit lines", desc: "Query smart contract credit lines — available to borrow, outstanding debt, limits" },
                            ].map(item => (
                                <div key={item.title} style={{
                                    padding: "18px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.07)",
                                    background: "rgba(255,255,255,0.02)",
                                }}>
                                    <div style={{ fontSize: "18px", marginBottom: "8px" }}>{item.icon}</div>
                                    <p style={{ fontSize: "13px", fontWeight: 600, color: "white", margin: "0 0 4px 0" }}>{item.title}</p>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: "1.6" }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── INSTALLATION ── */}
                    <SectionHeading id="installation">Installation</SectionHeading>
                    <P>Install via npm, yarn, or pnpm:</P>
                    <CodeBlock lang="bash" code={`npm install credgate-sdk
# or
yarn add credgate-sdk
# or
pnpm add credgate-sdk`} />

                    <P>The SDK has zero runtime dependencies beyond the standard fetch API (available natively in Node 18+ and all modern browsers).</P>

                    <SubHeading>Environment setup</SubHeading>
                    <P>Add your CredGate API URL to your environment:</P>
                    <CodeBlock lang="bash" code={`# .env
CREDGATE_API_URL=https://api.credgate.xyz
CREDGATE_API_KEY=your_api_key_here`} />

                    {/* ── QUICK START ── */}
                    <SectionHeading id="quickstart">Quick Start</SectionHeading>
                    <P>Get a wallet's credit score in under 10 lines:</P>
                    <CodeBlock code={`import { CredGateClient } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: process.env.CREDGATE_API_URL,
  apiKey: process.env.CREDGATE_API_KEY,
});

// Analyze + wait for score
const result = await client.analyzeWallet("0xabc...123");

console.log(result.creditScore);     // 87
console.log(result.tier);            // "PRIME"
console.log(result.maxLoanSizeUSD);  // 250000`} />

                    <SubHeading>React hook example</SubHeading>
                    <P>Use the built-in React hook for seamless wallet score integration:</P>
                    <CodeBlock code={`import { useCredGate } from "credgate-sdk/react";
import { useAccount } from "wagmi";

export function CreditBadge() {
  const { address } = useAccount();
  const { score, tier, loading, analyze } = useCredGate(address);

  if (loading) return <Spinner />;

  return (
    <div>
      <p>Score: {score}/100</p>
      <p>Tier: {tier}</p>
      <button onClick={analyze}>Re-analyze</button>
    </div>
  );
}`} />

                    {/* ── ANALYZE WALLET ── */}
                    <SectionHeading id="analyze">analyzeWallet()</SectionHeading>
                    <MethodCard
                        method="client.analyzeWallet(address, options?)"
                        returns="Promise<AnalysisResult>"
                        desc="Triggers a full wallet analysis. Fetches on-chain data, computes credit intelligence, and initiates ZK proof generation on CreditCoin."
                        badge="ASYNC"
                    />

                    <SubHeading>Parameters</SubHeading>
                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0 16px", marginBottom: "20px" }}>
                        <Param name="address" type="string" required desc="EVM wallet address to analyze (checksummed or lowercase)" />
                        <Param name="options.pollInterval" type="number" desc="How often to poll for result in ms (default: 3000)" />
                        <Param name="options.timeout" type="number" desc="Max wait time in ms before throwing (default: 120000)" />
                        <Param name="options.skipCache" type="boolean" desc="Force re-analysis even if recent result exists (default: false)" />
                    </div>

                    <SubHeading>Example</SubHeading>
                    <CodeBlock code={`const result = await client.analyzeWallet("0xabc...123", {
  pollInterval: 3000,
  timeout: 120_000,
  skipCache: false,
});

// result shape:
// {
//   status: "DONE",
//   creditScore: 87,
//   tier: "PRIME",
//   maxLoanSizeUSD: 250000,
//   recommendedLTV: 70,
//   scoreBreakdown: {
//     lending: 30,
//     stable: 35,
//     dex: 13,
//     crossChain: 8,
//     ageBonus: 14,
//     riskPenalty: -7,
//   },
//   onchain: { status: "COOLDOWN_ACTIVE", remainingSeconds: 86400 }
// }`} />

                    <SubHeading>Cooldown handling</SubHeading>
                    <P>Wallets can only be re-analyzed once every 24 hours. If a cooldown is active, <code style={{ color: "#4ef2e8", fontFamily: "monospace" }}>result.onchain.status</code> will be <code style={{ color: "#a5f3fc", fontFamily: "monospace" }}>"COOLDOWN_ACTIVE"</code> and <code style={{ color: "#4ef2e8", fontFamily: "monospace" }}>result.onchain.remainingSeconds</code> tells you how long to wait.</P>

                    <CodeBlock code={`const result = await client.analyzeWallet(address);

if (result.onchain?.status === "COOLDOWN_ACTIVE") {
  const hours = Math.ceil(result.onchain.remainingSeconds / 3600);
  console.log(\`Cooldown active — try again in \${hours}h\`);
}`} />

                    {/* ── GET SCORE ── */}
                    <SectionHeading id="score">getScore()</SectionHeading>
                    <MethodCard
                        method="client.getScore(address)"
                        returns="Promise<ScoreResult | null>"
                        desc="Fetch the latest cached score for a wallet without triggering a new analysis. Returns null if the wallet has never been analyzed."
                    />

                    <CodeBlock code={`const score = await client.getScore("0xabc...123");

if (!score) {
  // Wallet has never been analyzed
  await client.analyzeWallet("0xabc...123");
} else {
  console.log(score.creditScore);  // 87
  console.log(score.tier);         // "PRIME"
}

// Tier values:
// "ELITE"     → score 95-100 → lowest APR
// "PRIME"     → score 80-94
// "PREFERRED" → score 65-79
// "STANDARD"  → score 50-64
// "REJECT"    → score < 50  → no credit line`} />

                    {/* ── PROOF STATUS ── */}
                    <SectionHeading id="proof">getProofStatus()</SectionHeading>
                    <MethodCard
                        method="client.getProofStatus(address)"
                        returns="Promise<ProofStatus>"
                        desc="Get the current CreditCoin ZK proof status for a wallet. Poll this to track verification progress."
                    />

                    <SubHeading>Proof lifecycle</SubHeading>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "12px 0 20px 0" }}>
                        {[
                            { status: "waiting_attestation", color: "#f59e0b", desc: "Waiting for CreditCoin block attestation" },
                            { status: "generating_proof", color: "#a78bfa", desc: "ZK proof being computed off-chain" },
                            { status: "submitting", color: "#4ef2e8", desc: "Submitting proof transaction to CreditCoin" },
                            { status: "success", color: "#4ade80", desc: "Proof verified and recorded on-chain" },
                            { status: "failed", color: "#f87171", desc: "Submission failed — safe to retry" },
                        ].map(item => (
                            <div key={item.status} style={{
                                display: "flex", alignItems: "center", gap: "12px",
                                padding: "10px 14px", borderRadius: "8px",
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                                <code style={{ fontSize: "12px", color: item.color, fontFamily: "monospace", minWidth: "180px" }}>{item.status}</code>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{item.desc}</span>
                            </div>
                        ))}
                    </div>

                    <CodeBlock code={`// Poll proof status until done
async function waitForProof(address: string) {
  while (true) {
    const proof = await client.getProofStatus(address);

    if (proof.status === "success") {
      console.log("Verified! Tx:", proof.txHash);
      return proof;
    }

    if (proof.status === "failed") {
      throw new Error("Proof failed — retry analyzeWallet()");
    }

    // Still in progress — wait and poll again
    await new Promise(r => setTimeout(r, 5000));
  }
}`} />

                    {/* ── CREDIT LINE ── */}
                    <SectionHeading id="creditline">getCreditLine()</SectionHeading>
                    <MethodCard
                        method="client.getCreditLine(address)"
                        returns="Promise<CreditLineResult>"
                        desc="Query on-chain credit line data directly from the CreditVault smart contract. Requires a configured RPC URL."
                    />

                    <CodeBlock code={`import { CredGateClient } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: process.env.CREDGATE_API_URL,
  rpcUrl: "https://rpc.sepolia.org",       // required for on-chain reads
  vaultAddress: "0xe517a8D0b9B5597...",    // CreditVault contract
});

const line = await client.getCreditLine("0xabc...123");

console.log(line.creditLine);    // 250000000000n (USDC 6 decimals)
console.log(line.available);     // 125000000000n
console.log(line.outstanding);   // { principal, interest, total }
console.log(line.utilizationPct); // 50`} />

                    {/* ── WEBHOOKS ── */}
                    <SectionHeading id="webhooks">Webhooks</SectionHeading>
                    <P>Subscribe to proof completion events instead of polling. Register a webhook URL in your CredGate dashboard and CredGate will POST to your endpoint when a proof is verified.</P>

                    <SubHeading>Webhook payload</SubHeading>
                    <CodeBlock lang="json" code={`{
  "event": "proof.success",
  "address": "0xabc...123",
  "txHash": "0xdef...456",
  "creditScore": 87,
  "tier": "PRIME",
  "timestamp": 1772524753563,
  "signature": "0x..."  // HMAC-SHA256 of payload with your webhook secret
}`} />

                    <SubHeading>Verifying webhook signatures</SubHeading>
                    <CodeBlock code={`import { verifyWebhookSignature } from "credgate-sdk/webhooks";

// In your Next.js API route / Express handler:
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-credgate-signature");

  const isValid = verifyWebhookSignature(
    body,
    signature,
    process.env.CREDGATE_WEBHOOK_SECRET,
  );

  if (!isValid) return new Response("Unauthorized", { status: 401 });

  const event = JSON.parse(body);

  if (event.event === "proof.success") {
    // Unlock credit line, update UI, send notification...
    await unlockCreditLine(event.address, event.tier);
  }

  return new Response("OK");
}`} />

                    {/* ── ERRORS ── */}
                    <SectionHeading id="errors">Error Handling</SectionHeading>
                    <P>All SDK methods throw typed <code style={{ color: "#4ef2e8", fontFamily: "monospace" }}>CredGateError</code> instances with a <code style={{ color: "#4ef2e8", fontFamily: "monospace" }}>code</code> field for easy handling:</P>

                    <CodeBlock code={`import { CredGateClient, CredGateError, ErrorCode } from "credgate-sdk";

try {
  const result = await client.analyzeWallet(address);
} catch (err) {
  if (err instanceof CredGateError) {
    switch (err.code) {
      case ErrorCode.COOLDOWN_ACTIVE:
        console.log("Wait", err.meta.remainingSeconds, "seconds");
        break;
      case ErrorCode.ANALYSIS_TIMEOUT:
        console.log("Analysis took too long — retry");
        break;
      case ErrorCode.WALLET_NOT_FOUND:
        console.log("No data for this wallet");
        break;
      case ErrorCode.PROOF_FAILED:
        console.log("On-chain proof failed:", err.meta.txHash);
        break;
      case ErrorCode.UNAUTHORIZED:
        console.log("Check your API key");
        break;
    }
  }
}`} />

                    {/* ── TYPES ── */}
                    <SectionHeading id="types">TypeScript Types</SectionHeading>
                    <P>Full TypeScript definitions ship with the SDK:</P>

                    <CodeBlock code={`// Core types exported from credgate-sdk

type CreditTier =
  | "ELITE"
  | "PRIME"
  | "PREFERRED"
  | "STANDARD"
  | "REJECT";

interface AnalysisResult {
  status: "DONE";
  creditScore: number;          // 0–100
  tier: CreditTier;
  maxLoanSizeUSD: number;
  recommendedLTV: number;       // percentage e.g. 70
  scoreBreakdown: {
    lending: number;
    stable: number;
    dex: number;
    crossChain: number;
    ageBonus: number;
    riskPenalty: number;
  };
  onchain?: {
    status: "COOLDOWN_ACTIVE" | "UPDATED";
    remainingSeconds?: number;
  };
}

interface ProofStatus {
  status: "waiting_attestation" | "generating_proof" | "submitting" | "success" | "failed" | "not_found";
  jobId?: string;
  txHash?: string;
  currentAttestedBlock?: number;
  targetBlock?: number;
  blocksRemaining?: number;
  estimatedWaitSeconds?: number;
  error?: string;
}

interface CreditLineResult {
  creditLine: bigint;
  available: bigint;
  outstanding: {
    principal: bigint;
    interest: bigint;
    total: bigint;
  };
  utilizationPct: number;
}`} />

                    {/* Footer */}
                    <div style={{
                        marginTop: "64px",
                        paddingTop: "24px",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>
                            credgate-sdk v1.0.0 · MIT License
                        </span>
                        <div style={{ display: "flex", gap: "16px" }}>
                            <a href="https://github.com/credgate/sdk" target="_blank" rel="noreferrer"
                                style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
                                GitHub ↗
                            </a>
                            <a href="https://www.npmjs.com/package/credgate-sdk" target="_blank" rel="noreferrer"
                                style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
                                npm ↗
                            </a>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}