"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const SECTIONS = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "installation", label: "Installation", icon: "⬇" },
    { id: "quickstart", label: "Quick Start", icon: "⚡" },
    { id: "client", label: "CredGateClient", icon: "◎" },
    { id: "analyze", label: "analyzeWallet()", icon: "◐" },
    { id: "getscore", label: "getScore()", icon: "◑" },
    { id: "proof", label: "Proof Tracking", icon: "◒" },
    { id: "onchain", label: "On-chain Status", icon: "◓" },
    { id: "helpers", label: "Helpers", icon: "△" },
    { id: "react", label: "React Hooks", icon: "⬡" },
    { id: "errors", label: "Error Handling", icon: "⬢" },
    { id: "types", label: "TypeScript Types", icon: "◆" },
    { id: "tiers", label: "Credit Tiers", icon: "◇" },
    { id: "lifecycle", label: "Proof Lifecycle", icon: "○" },
];

function highlightCode(code: string): string {
    // HTML escape first
    let out = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Remove inline style-like comment annotations entirely.
    // These are the // comment lines that contain style="color:..." artifacts.
    // We strip them and replace with a clean dim span containing only the text after //
    // Strategy: tokenize line by line, handle strings before comments on each line.

    const lines = out.split("\n");
    const result = lines.map(line => {
        // Find first // that is not inside a string on this line
        let inStr: string | null = null;
        let commentIdx = -1;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inStr) {
                if (ch === inStr && line[i - 1] !== "\\") inStr = null;
            } else if (ch === "\`" || ch === "'" || ch === "\"") {
                inStr = ch;
            } else if (ch === "/" && line[i + 1] === "/") {
                commentIdx = i;
                break;
            }
        }

        if (commentIdx === -1) {
            // No comment — highlight the whole line normally
            return highlightTokens(line);
        }

        const codePart = line.slice(0, commentIdx);
        const commentPart = line.slice(commentIdx);
        // Strip any style="..." from the comment text to prevent color leaking
        const safeComment = commentPart.replace(/style="[^"]*"/g, "");
        return highlightTokens(codePart) + `<span style="color:rgba(255,255,255,0.38)">${safeComment}</span>`;
    });

    return result.join("\n");
}

function highlightTokens(code: string): string {
    // Stash string literals so regexes below don't touch their content
    const stash: string[] = [];
    let out = code.replace(/(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m) => {
        stash.push(`<span style="color:#a5f3fc">${m}</span>`);
        return "\x00S" + (stash.length - 1) + "\x00";
    });

    out = out
        .replace(/\b(import|export|from|const|let|var|async|await|return|new|if|else|throw|try|catch|type|interface|extends|default|function|class|switch|case|break)\b/g, '<span style="color:#c084fc">$1</span>')
        .replace(/\b(true|false|null|undefined)\b/g, '<span style="color:#fcd34d">$1</span>')
        .replace(/\b(\d+(?:_\d+)*)\b/g, '<span style="color:#fbbf24">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span style="color:#4ef2e8">$1</span>')
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span style="color:#7dd3fc">$1</span>');

    // Restore strings
    out = out.replace(/\x00S(\d+)\x00/g, (_: string, i: string) => stash[+i]);
    return out;
}

function CodeBlock({ code, lang = "typescript", filename }: { code: string; lang?: string; filename?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div style={{ borderRadius: "12px", border: "1px solid rgba(78,242,232,0.12)", background: "rgba(0,0,0,0.4)", overflow: "hidden", marginTop: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {filename && <span style={{ fontSize: "11px", color: "#4ef2e8", fontFamily: "monospace" }}>{filename}</span>}
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{lang}</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ fontSize: "11px", color: copied ? "#4ef2e8" : "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", transition: "color 0.2s", fontFamily: "inherit" }}>
                    {copied ? "✓ COPIED" : "COPY"}
                </button>
            </div>
            <pre style={{ margin: 0, padding: "20px", overflowX: "auto", fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace", fontSize: "13px", lineHeight: "1.75", color: "rgba(255,255,255,0.85)" }}>
                <code dangerouslySetInnerHTML={{ __html: lang === "bash" ? code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(#[^\n]*)/g, '<span style="color:rgba(255,255,255,0.28)">$1</span>') : highlightCode(code) }} />
            </pre>
        </div>
    );
}

function Badge({ label, color }: { label: string; color: string }) {
    return <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: "4px", color, background: color + "18", border: `1px solid ${color}30`, fontFamily: "monospace" }}>{label}</span>;
}

function SH({ id, children }: { id: string; children: React.ReactNode }) {
    return <h2 id={id} style={{ fontSize: "22px", fontWeight: 700, color: "white", marginTop: "52px", marginBottom: "6px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", scrollMarginTop: "80px", letterSpacing: "-0.02em" }}>{children}</h2>;
}
function Sub({ children }: { children: React.ReactNode }) {
    return <h3 style={{ fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.8)", marginTop: "28px", marginBottom: "8px" }}>{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
    return <p style={{ fontSize: "14px", lineHeight: "1.8", color: "rgba(255,255,255,0.55)", margin: "8px 0" }}>{children}</p>;
}
function IC({ children }: { children: React.ReactNode }) {
    return <code style={{ fontSize: "12px", color: "#a5f3fc", fontFamily: "monospace", background: "rgba(165,243,252,0.08)", padding: "1px 6px", borderRadius: "4px", border: "1px solid rgba(165,243,252,0.12)" }}>{children}</code>;
}
function MCard({ method, returns, desc, badge }: { method: string; returns: string; desc: string; badge?: string }) {
    return (
        <div style={{ padding: "16px 20px", borderRadius: "10px", border: "1px solid rgba(78,242,232,0.15)", background: "rgba(78,242,232,0.03)", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <code style={{ fontSize: "14px", color: "#4ef2e8", fontFamily: "monospace" }}>{method}</code>
                {badge && <Badge label={badge} color="#f59e0b" />}
            </div>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px 0" }}>Returns: <IC>{returns}</IC></p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.7 }}>{desc}</p>
        </div>
    );
}
function Prm({ name, type, req, desc }: { name: string; type: string; req?: boolean; desc: string }) {
    return (
        <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "flex-start" }}>
            <div style={{ minWidth: "170px", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}><IC>{name}</IC>{req && <span style={{ color: "#f87171", fontSize: "10px" }}>*</span>}</div>
            <div style={{ minWidth: "130px", flexShrink: 0 }}><IC>{type}</IC></div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{desc}</span>
        </div>
    );
}
function Note({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
    return <div style={{ padding: "13px 18px", borderRadius: "10px", margin: "16px 0", fontSize: "13px", lineHeight: "1.7", color: "rgba(255,255,255,0.6)", background: color + "08", border: `1px solid ${color}22` }}>{icon} {children}</div>;
}

export default function DocsPage() {
    const [active, setActive] = useState("overview");
    const obs = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        obs.current = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
            { rootMargin: "-25% 0px -65% 0px" }
        );
        SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.current?.observe(el); });
        return () => obs.current?.disconnect();
    }, []);

    const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <div style={{ minHeight: "100vh", background: "#060a0f", color: "white", fontFamily: "'JetBrains Mono', monospace" }}>

            {/* Navbar */}
            <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,10,15,0.92)", backdropFilter: "blur(12px)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "white" }}>Cred<span style={{ color: "#4ef2e8" }}>Gate</span></span>
                    </Link>
                    <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>SDK DOCS</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <Link href="/dashboard" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Dashboard</Link>
                    <Link href="/credlend" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>CredLend</Link>
                    <a href="https://www.npmjs.com/package/credgate-sdk" target="_blank" rel="noreferrer"
                        style={{ fontSize: "12px", fontWeight: 600, padding: "6px 14px", borderRadius: "8px", background: "rgba(78,242,232,0.1)", border: "1px solid rgba(78,242,232,0.3)", color: "#4ef2e8", textDecoration: "none", letterSpacing: "0.04em" }}>
                        npm ↗
                    </a>
                </div>
            </nav>

            <div style={{ display: "flex", maxWidth: "1280px", margin: "0 auto" }}>

                {/* Sidebar */}
                <aside style={{ width: "220px", flexShrink: 0, position: "sticky", top: "56px", height: "calc(100vh - 56px)", overflowY: "auto", padding: "32px 0 32px 24px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", marginBottom: "12px" }}>REFERENCE</p>
                    {SECTIONS.map((s) => (
                        <button key={s.id} onClick={() => go(s.id)} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "7px 10px", borderRadius: "7px", border: "none", background: active === s.id ? "rgba(78,242,232,0.1)" : "transparent", color: active === s.id ? "#4ef2e8" : "rgba(255,255,255,0.4)", fontSize: "12px", fontFamily: "inherit", cursor: "pointer", textAlign: "left", transition: "all 0.15s", marginBottom: "2px" }}>
                            <span style={{ fontSize: "10px", opacity: 0.7 }}>{s.icon}</span>{s.label}
                        </button>
                    ))}
                    <div style={{ marginTop: "32px", marginRight: "16px", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginBottom: "4px" }}>VERSION</p>
                        <p style={{ fontSize: "13px", color: "#4ef2e8", fontFamily: "monospace", fontWeight: 700 }}>1.0.0</p>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>credgate-sdk</p>
                    </div>
                </aside>

                {/* Content */}
                <main style={{ flex: 1, padding: "40px 48px 80px 48px", maxWidth: "860px", minWidth: 0 }}>

                    {/* ── OVERVIEW ── */}
                    <div id="overview">
                        <div style={{ padding: "32px", borderRadius: "16px", border: "1px solid rgba(78,242,232,0.2)", background: "linear-gradient(135deg, rgba(78,242,232,0.05) 0%, rgba(0,0,0,0) 60%)", marginBottom: "32px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(78,242,232,0.12)", border: "1px solid rgba(78,242,232,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>◈</div>
                                <div>
                                    <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>credgate-sdk</h1>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>On-chain credit scoring for any DeFi lending protocol</p>
                                </div>
                            </div>
                            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.8", margin: "0 0 16px 0" }}>
                                Integrate wallet-based undercollateralized lending into any dApp. Analyze on-chain wallet history across Aave, DEXs, stablecoins and multiple chains — get a structured credit score, loan profile, and ZK-verified proof on CreditCoin.
                            </p>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                                {[["TypeScript", "#4ef2e8"], ["ZK Proofs", "#a78bfa"], ["CreditCoin", "#f59e0b"], ["React Hooks", "#4ade80"], ["MIT", "#94a3b8"]].map(([l, c]) => <Badge key={l} label={l} color={c} />)}
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            {[
                                { icon: "◎", title: "Wallet Analysis", desc: "Aave history, stablecoin treasury, DEX activity, cross-chain maturity — one call" },
                                { icon: "◐", title: "Credit Scores", desc: "0–100 score, tier, max loan size, recommended LTV, full breakdown by category" },
                                { icon: "◑", title: "ZK Proof Tracking", desc: "Real-time proof lifecycle: Sepolia attestation → CreditCoin USC → verified on-chain" },
                                { icon: "◒", title: "React Ready", desc: "useCredGate + useSimpleScore hooks with polling, cooldown timer, and error states" },
                            ].map(item => (
                                <div key={item.title} style={{ padding: "18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                                    <div style={{ fontSize: "18px", marginBottom: "8px" }}>{item.icon}</div>
                                    <p style={{ fontSize: "13px", fontWeight: 600, color: "white", margin: "0 0 4px 0" }}>{item.title}</p>
                                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: "1.6" }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── INSTALLATION ── */}
                    <SH id="installation">Installation</SH>
                    <P>Install via npm, yarn, or pnpm:</P>
                    <CodeBlock lang="bash" code={`npm install credgate-sdk
# or
yarn add credgate-sdk
# or
pnpm add credgate-sdk`} />
                    <P>Zero runtime dependencies — uses the native <IC>fetch</IC> API (Node 18+ and all modern browsers).</P>

                    <Sub>TypeScript project setup</Sub>
                    <P>Create a <IC>tsconfig.json</IC> in your project root. Do not use <IC>npx tsc --init</IC> — it enables <IC>verbatimModuleSyntax</IC> which conflicts with CommonJS and will cause import errors.</P>
                    <CodeBlock lang="json" filename="tsconfig.json" code={`{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  }
}`} />

                    <Sub>Install ts-node for running scripts directly</Sub>
                    <CodeBlock lang="bash" code={`npm install --save-dev typescript ts-node @types/node`} />

                    <Sub>Environment variables</Sub>
                    <CodeBlock lang="bash" filename=".env" code={`CREDGATE_API_URL=http://localhost:3000   # your NestJS backend URL
CREDGATE_API_KEY=optional_key_here       # if you added auth to your backend`} />

                    {/* ── QUICK START ── */}
                    <SH id="quickstart">Quick Start</SH>
                    <P>From install to first credit score. Below is a real script with the actual output from a live wallet:</P>

                    <CodeBlock filename="test.ts" code={`import { CredGateClient, CredGateError, ErrorCode } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: "http://localhost:3000",  // your CredGate backend
});

async function main() {
  // Analyze + poll until score is ready
  const result = await client.analyzeWallet("0x05631891643A2E9dd5CC44293F14CAA4b4CD98B2", {
    timeout: 120_000,
  });

  console.log(result.score.creditScore);                   // 89
  console.log(result.score.tier);                          // "PRIME"
  console.log(result.score.loanProfile.maxLoanSizeUSD);    // 209998
  console.log(result.score.loanProfile.recommendedLTV);    // 70
  console.log(result.score.loanProfile.interestTier);      // "PRIME"
  console.log(result.score.riskLevel);                     // "LOW"
  console.log(result.score.riskScore);                     // 10
  console.log(result.score.scoreBreakdown);
  // { lending: 30, stable: 18.46, crossChain: 14, dex: 15, ageBonus: 13.85, riskPenalty: 2 }
  console.log(result.onchain.status);                      // "UPDATED"
}

main().catch(console.error);`} />

                    <CodeBlock lang="bash" code={`# Make sure your backend is running first
cd your-credgate-backend && npm run start:dev

# Then run the test
npx ts-node test.ts`} />

                    <Sub>Real terminal output</Sub>
                    <CodeBlock lang="bash" code={`🔍 Testing credgate-sdk...

1. Analyzing wallet...
✅ Score: 89
   Tier: PRIME
   Max Loan: $209998
   LTV: 70%
   Interest Tier: PRIME
   Risk: LOW (10)
   Breakdown: { lending: 30, stable: 18.46, crossChain: 14, dex: 15, ageBonus: 13.85, riskPenalty: 2 }
   On-chain status: UPDATED
   Proof status: not_found   # proof kicks off after RegistryWatcher detects ScoreUpdated

2. Getting cached score...
✅ Cached score: 89 | Tier: PRIME

3. Checking eligibility...
✅ Eligible to borrow

4. Getting max loan...
✅ Max loan: $209998

7. Polling proof status...
   → ⏳ Waiting for CreditCoin attestation — 14 blocks left (~168s)
   → ⏳ Waiting for CreditCoin attestation — 4 blocks left (~48s)
   → 📤 Submitting to CreditCoin USC
   → ✅ Proof verified on-chain!
      tx: 0xb996eb20aec01aa4b3e856b3ba0c6285ca668c2307d984f6f48246c4131d6b7d`} />

                    {/* ── CLIENT ── */}
                    <SH id="client">CredGateClient</SH>
                    <P>The main entry point. Create one instance and reuse it across your app.</P>
                    <CodeBlock code={`import { CredGateClient } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: "http://localhost:3000",  // required — your NestJS backend
  apiKey: "sk_live_...",            // optional — forwarded as x-api-key header
  pollInterval: 3000,               // optional — ms between polls (default: 3000)
  timeout: 120_000,                 // optional — analysis timeout ms (default: 120000)
});`} />
                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0 16px", marginBottom: "20px" }}>
                        <Prm name="apiUrl" type="string" req desc="Base URL of your CredGate NestJS backend. No trailing slash needed." />
                        <Prm name="apiKey" type="string" desc="Optional API key forwarded as x-api-key on every request." />
                        <Prm name="pollInterval" type="number" desc="How often to poll /wallet/result/:address in ms. Default: 3000." />
                        <Prm name="timeout" type="number" desc="Max ms before throwing ANALYSIS_TIMEOUT. Default: 120000." />
                    </div>

                    {/* ── ANALYZE ── */}
                    <SH id="analyze">analyzeWallet()</SH>
                    <MCard method="client.analyzeWallet(address, options?)" returns="Promise<AnalysisResult>" badge="ASYNC"
                        desc="Triggers full wallet analysis — Aave lending history, stablecoin treasury, DEX activity, cross-chain maturity. Polls until the score is ready, then emits ScoreUpdated on Sepolia which kicks off the CreditCoin ZK proof pipeline." />

                    <Sub>Parameters</Sub>
                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0 16px", marginBottom: "20px" }}>
                        <Prm name="address" type="string" req desc="EVM wallet address (0x...). Checksummed or lowercase both work." />
                        <Prm name="options.pollInterval" type="number" desc="Override poll interval for this call only (ms)." />
                        <Prm name="options.timeout" type="number" desc="Override timeout for this call only (ms)." />
                        <Prm name="options.waitForProof" type="boolean" desc="Also wait for CreditCoin ZK proof to reach success/failed before resolving." />
                    </div>

                    <Sub>Full usage</Sub>
                    <CodeBlock code={`const result = await client.analyzeWallet("0x05631891643A2E9dd5CC44293F14CAA4b4CD98B2", {
  timeout: 120_000,
});

// Score
console.log(result.score.creditScore);   // 89
console.log(result.score.tier);          // "PRIME"
console.log(result.score.riskScore);     // 10
console.log(result.score.riskLevel);     // "LOW"

// Loan profile
console.log(result.score.loanProfile.maxLoanSizeUSD);  // 209998
console.log(result.score.loanProfile.recommendedLTV);  // 70
console.log(result.score.loanProfile.interestTier);    // "PRIME"

// Score breakdown
console.log(result.score.scoreBreakdown);
// { lending: 30, stable: 18.46, crossChain: 14, dex: 15, ageBonus: 13.85, riskPenalty: 2 }

// On-chain Sepolia status
console.log(result.onchain.status);  // "UPDATED"`} />

                    <Sub>Also wait for ZK proof</Sub>
                    <CodeBlock code={`const result = await client.analyzeWallet("0x...", {
  waitForProof: true,
  timeout: 1_800_000,  // 30 min — attestation takes 10–30 min
});

console.log(result.proof?.status);   // "success"
console.log(result.proof?.txHash);
// "0xb996eb20aec01aa4b3e856b3ba0c6285ca668c2307d984f6f48246c4131d6b7d"`} />

                    <Sub>Cooldown handling</Sub>
                    <P>Wallets have a cooldown in <IC>CreditScoreRegistry.sol</IC> (default 5 min). If active, an error is thrown:</P>
                    <CodeBlock code={`import { CredGateError, ErrorCode } from "credgate-sdk";

try {
  await client.analyzeWallet(address);
} catch (err) {
  if (err instanceof CredGateError && err.code === ErrorCode.COOLDOWN_ACTIVE) {
    const secs = err.meta?.remainingSeconds as number;
    console.log(\`Try again in \${Math.ceil(secs / 60)} minutes\`);
  }
}`} />

                    {/* ── GET SCORE ── */}
                    <SH id="getscore">getScore()</SH>
                    <MCard method="client.getScore(address)" returns="Promise<ScoreResult | null>"
                        desc="Fetches the latest cached score without triggering new analysis. Returns null if the wallet has never been analyzed. Fast — no polling involved." />
                    <CodeBlock code={`const score = await client.getScore("0x...");

if (!score) {
  // Never analyzed — trigger it
  await client.analyzeWallet(address);
  return;
}

console.log(score.creditScore);                  // 89
console.log(score.tier);                         // "PRIME"
console.log(score.loanProfile.maxLoanSizeUSD);   // 209998
console.log(score.analyzedAt);                   // unix timestamp ms

// Common gating pattern
if (score.tier === "REJECT" || score.loanProfile.maxLoanSizeUSD === 0) {
  return showIneligibleState();
}
showBorrowUI(score.loanProfile.maxLoanSizeUSD);`} />

                    {/* ── PROOF ── */}
                    <SH id="proof">Proof Tracking</SH>
                    <P>After analysis, the <IC>RegistryWatcherService</IC> detects the <IC>ScoreUpdated</IC> event on Sepolia and starts the CreditCoin ZK proof. Proof status starts as <IC>not_found</IC> until that happens.</P>

                    <Sub>getProofStatus()</Sub>
                    <MCard method="client.getProofStatus(address)" returns="Promise<ProofStatus>"
                        desc="Single snapshot of current proof state. Check blocksRemaining and estimatedWaitSeconds to show a progress indicator during waiting_attestation." />
                    <CodeBlock code={`const proof = await client.getProofStatus("0x...");

console.log(proof.status);               // "waiting_attestation"
console.log(proof.blocksRemaining);      // 14
console.log(proof.estimatedWaitSeconds); // 168
console.log(proof.currentAttestedBlock); // 7450000
console.log(proof.targetBlock);          // 7450014`} />

                    <Sub>Poll with status labels</Sub>
                    <CodeBlock code={`const PROOF_POLL_MS = 5000;

const poller = setInterval(async () => {
  const proof = await client.getProofStatus(address);

  const labels: Record<string, string> = {
    not_found:           "⏸  Not started yet",
    queued:              "📋 Queued",
    checking_contract:   "🔍 Checking contract",
    fetching_tx:         "📡 Fetching Sepolia tx",
    waiting_attestation: \`⏳ \${proof.blocksRemaining} blocks left (~\${proof.estimatedWaitSeconds}s)\`,
    generating_proof:    "⚙️  Generating ZK proof",
    submitting:          "📤 Submitting to CreditCoin USC",
    success:             \`✅ Verified! tx: \${proof.txHash}\`,
    failed:              \`❌ Failed: \${proof.error}\`,
  };

  console.log("→", labels[proof.status] ?? proof.status);

  if (proof.status === "success" || proof.status === "failed") {
    clearInterval(poller);
  }
}, PROOF_POLL_MS);`} />

                    <Sub>waitForProof()</Sub>
                    <MCard method="client.waitForProof(address, options?)" returns="Promise<ProofStatus>"
                        desc="Polls until success. Throws CredGateError with PROOF_FAILED on failure." />
                    <CodeBlock code={`try {
  const proof = await client.waitForProof("0x...", {
    timeout: 1_800_000,   // 30 min
    pollInterval: 10_000,
  });
  console.log("CreditCoin tx:", proof.txHash);
  // "0xb996eb20aec01aa4b3e856b3ba0c6285ca668c2307d984f6f48246c4131d6b7d"
} catch (err) {
  if (err instanceof CredGateError && err.code === ErrorCode.PROOF_FAILED) {
    console.log("Proof failed:", err.message);
  }
}`} />

                    {/* ── ONCHAIN ── */}
                    <SH id="onchain">On-chain Status</SH>
                    <Note color="#f59e0b" icon="🔗">
                        <strong style={{ color: "#f59e0b" }}>Contract deployment:</strong> Only <IC>CreditScoreRegistry.sol</IC> is on Sepolia. All other contracts (<IC>CreditScoreUSC</IC>, <IC>CreditAggregator</IC>, <IC>CreditVault</IC>) are deployed on <IC>CreditCoin USC Testnet</IC> — chain ID <IC>102036</IC>, RPC <IC>https://rpc.usc-testnet2.creditcoin.network</IC>.
                    </Note>
                    <P>The <IC>getOnChainStatus()</IC> call reflects the Sepolia <IC>CreditScoreRegistry</IC> state. The ZK proof (tracked separately) finalises the score on CreditCoin USC.</P>
                    <CodeBlock code={`const status = await client.getOnChainStatus("0x...");

// "UPDATED"         = score stored on Sepolia CreditScoreRegistry ✓
// "COOLDOWN_ACTIVE" = can't update yet (5 min default cooldown in contract)
// "NOT_SUBMITTED"   = never pushed on-chain for this wallet

console.log(status.status);            // "UPDATED"
console.log(status.txHash);            // Sepolia tx of ScoreUpdated event
console.log(status.reportHash);        // keccak256 of score data
console.log(status.remainingSeconds);  // seconds until next update allowed`} />
                    <Note color="#4ef2e8" icon="💡">
                        <strong style={{ color: "#4ef2e8" }}>Make sure the watcher is running.</strong> The <IC>RegistryWatcherService</IC> lines in <IC>main.ts</IC> are commented out by default. Uncomment them to enable automatic proof generation whenever a <IC>ScoreUpdated</IC> event is emitted.
                    </Note>

                    {/* ── HELPERS ── */}
                    <SH id="helpers">Helpers</SH>
                    <Sub>isEligible()</Sub>
                    <P>Returns false if tier is REJECT or maxLoanSizeUSD is 0. Great for server-side gating.</P>
                    <CodeBlock code={`const eligible = await client.isEligible("0x...");

// Server-side loan gating (Express / NestJS)
if (!(await client.isEligible(userAddress))) {
  return res.status(403).json({ error: "Insufficient credit score" });
}
// proceed with disbursement...`} />

                    <Sub>getMaxLoan()</Sub>
                    <CodeBlock code={`const maxLoan = await client.getMaxLoan("0x...");   // 209998

if (requestedAmount > maxLoan) {
  throw new Error(\`Exceeds credit line of $\${maxLoan}\`);
}`} />

                    <Sub>All methods at a glance</Sub>
                    <CodeBlock code={`client.analyzeWallet(address, options?)   // trigger analysis → AnalysisResult
client.getScore(address)                  // cached score → ScoreResult | null
client.getProofStatus(address)            // ZK proof state → ProofStatus
client.waitForProof(address, options?)    // poll until done → ProofStatus
client.getOnChainStatus(address)          // Sepolia registry → OnChainStatus
client.isEligible(address)                // quick gate → boolean
client.getMaxLoan(address)                // max loan USD → number`} />

                    {/* ── REACT ── */}
                    <SH id="react">React Hooks</SH>
                    <P>Import from <IC>credgate-sdk/react</IC> — separate entry point, fully tree-shakeable, no extra install.</P>

                    <Sub>useCredGate — full hook</Sub>
                    <CodeBlock code={`import { CredGateClient } from "credgate-sdk";
import { useCredGate } from "credgate-sdk/react";
import { useAccount } from "wagmi";

// Create once outside the component (or in a Context)
const client = new CredGateClient({ apiUrl: "http://localhost:3000" });

export function CreditWidget() {
  const { address } = useAccount();
  const {
    score,              // ScoreResult | null
    proof,              // ProofStatus | null
    onchain,            // OnChainStatus | null
    loading,            // true while fetching cached data on mount
    analyzing,          // true while analysis is in progress
    error,              // string | null
    cooldownRemaining,  // number — counts down from remainingSeconds
    analyze,            // () => Promise<void> — trigger new analysis
    refetch,            // () => Promise<void> — reload cached data
  } = useCredGate(client, address);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>{score?.creditScore ?? "—"} / 100</h2>
      <p>Tier: {score?.tier ?? "Not analyzed"}</p>
      <p>Max Loan: \${score?.loanProfile.maxLoanSizeUSD ?? 0}</p>
      <p>LTV: {score?.loanProfile.recommendedLTV ?? 0}%</p>

      {proof?.status === "waiting_attestation" && (
        <p>⏳ {proof.blocksRemaining} blocks left (~{proof.estimatedWaitSeconds}s)</p>
      )}
      {proof?.status === "success" && <p>✅ Verified on CreditCoin</p>}

      <button onClick={analyze} disabled={analyzing || cooldownRemaining > 0}>
        {analyzing ? "Analyzing..."
          : cooldownRemaining > 0 ? \`Cooldown: \${cooldownRemaining}s\`
          : score ? "Re-analyze" : "Check Score"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}`} />

                    <Sub>useCredGate options</Sub>
                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "0 16px", marginBottom: "20px" }}>
                        <Prm name="autoAnalyze" type="boolean" desc="Trigger analysis on mount if no cached score exists. Default: false." />
                        <Prm name="proofPollInterval" type="number" desc="Poll proof every N ms. 0 = disabled. Default: 5000." />
                    </div>

                    <Sub>useSimpleScore — minimal hook</Sub>
                    <CodeBlock code={`import { useSimpleScore } from "credgate-sdk/react";

export function LoanGate({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const { eligible, tier, maxLoan, recommendedLTV, loading, analyze } = useSimpleScore(client, address);

  if (loading) return <Spinner />;
  if (!eligible) return (
    <div>
      <p>You need a credit score to borrow.</p>
      <button onClick={analyze}>Check Eligibility</button>
    </div>
  );

  return (
    <div>
      <p>✅ {tier} · Up to \${maxLoan} at {recommendedLTV}% LTV</p>
      {children}
    </div>
  );
}`} />

                    {/* ── ERRORS ── */}
                    <SH id="errors">Error Handling</SH>
                    <P>All SDK methods throw typed <IC>CredGateError</IC> with a <IC>code</IC> field:</P>
                    <CodeBlock code={`import { CredGateClient, CredGateError, ErrorCode } from "credgate-sdk";

try {
  await client.analyzeWallet(address);
} catch (err) {
  if (!(err instanceof CredGateError)) throw err;

  switch (err.code) {
    case ErrorCode.COOLDOWN_ACTIVE:
      const secs = err.meta?.remainingSeconds as number;
      console.log(\`Try again in \${Math.ceil(secs / 60)} minutes\`);
      break;
    case ErrorCode.ANALYSIS_TIMEOUT:
      await client.analyzeWallet(address); // retry
      break;
    case ErrorCode.WALLET_NOT_FOUND:
      console.log("Wallet has no data");
      break;
    case ErrorCode.PROOF_FAILED:
      console.log("CreditCoin proof failed:", err.meta?.txHash);
      break;
    case ErrorCode.UNAUTHORIZED:
      console.log("Check your API key");
      break;
    case ErrorCode.NETWORK_ERROR:
      console.log("Backend unreachable:", err.message);
      break;
  }
}`} />

                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
                        {[
                            ["COOLDOWN_ACTIVE", "#f59e0b", "Contract cooldown active. err.meta.remainingSeconds available."],
                            ["ANALYSIS_TIMEOUT", "#f87171", "Backend exceeded timeout. Safe to retry."],
                            ["WALLET_NOT_FOUND", "#94a3b8", "No cached result. Call analyzeWallet() first."],
                            ["PROOF_FAILED", "#f87171", "CreditCoin proof failed. Check err.meta.txHash."],
                            ["UNAUTHORIZED", "#f87171", "Missing or invalid API key (401/403)."],
                            ["NETWORK_ERROR", "#f87171", "fetch() failed — backend unreachable."],
                            ["UNKNOWN", "#64748b", "Unhandled HTTP error. Status in err.message."],
                        ].map(([code, color, desc]) => (
                            <div key={code} style={{ display: "flex", gap: "16px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "flex-start" }}>
                                <code style={{ fontSize: "12px", color: color as string, fontFamily: "monospace", minWidth: "190px", flexShrink: 0 }}>{code}</code>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── TYPES ── */}
                    <SH id="types">TypeScript Types</SH>
                    <CodeBlock code={`import type {
  CredGateConfig,      // client constructor config
  AnalyzeOptions,      // analyzeWallet() options
  AnalysisResult,      // returned by analyzeWallet()
  ScoreResult,         // score + tier + loanProfile + breakdown
  LoanProfile,         // { recommendedLTV, interestTier, maxLoanSizeUSD }
  ScoreBreakdown,      // { lending, stable, crossChain, dex, ageBonus, riskPenalty }
  ProofStatus,         // ZK proof state + progress fields
  ProofStatusValue,    // union of all proof status strings
  OnChainStatus,       // Sepolia registry state
  CreditTier,          // "ELITE"|"PRIME"|"PREFERRED"|"STANDARD"|"REJECT"
  RiskLevel,           // "LOW"|"MEDIUM"|"HIGH"
} from "credgate-sdk";`} />

                    <Sub>ScoreResult shape</Sub>
                    <CodeBlock code={`interface ScoreResult {
  address: string;
  creditScore: number;       // 0–100             (e.g. 89)
  tier: CreditTier;          //                   (e.g. "PRIME")
  riskScore: number;         // 0–100             (e.g. 10)
  riskLevel: RiskLevel;      //                   (e.g. "LOW")
  loanProfile: {
    recommendedLTV: number;  // 0–70              (e.g. 70)
    interestTier: string;    //                   (e.g. "PRIME")
    maxLoanSizeUSD: number;  // capital × LTV     (e.g. 209998)
  };
  scoreBreakdown: {
    lending: number;         // Aave (max 30)     → 30
    stable: number;          // Stablecoin (max 35) → 18.46
    crossChain: number;      // Multi-chain (max 20) → 14
    dex: number;             // DEX (max 15)      → 15
    ageBonus: number;        // Age log-scale     → 13.85
    riskPenalty: number;     // Deducted          → 2
  };
  analyzedAt: number;        // unix ms
}`} />

                    <Sub>ProofStatus shape</Sub>
                    <CodeBlock code={`interface ProofStatus {
  status: ProofStatusValue;           // current lifecycle stage
  jobId?: string;                     // "job_0xabc123_1709..."
  txHash?: string;                    // CreditCoin USC tx on success
  error?: string;                     // error detail on failed
  currentAttestedBlock?: number;      // latest attested Sepolia block on CreditCoin
  targetBlock?: number;               // Sepolia block your ScoreUpdated tx is in
  blocksRemaining?: number;           // targetBlock - currentAttestedBlock
  estimatedWaitSeconds?: number;      // blocksRemaining × 12s
}`} />

                    {/* ── TIERS ── */}
                    <SH id="tiers">Credit Tiers</SH>
                    <P>Derived from credit score — determines LTV, interest, and max loan size:</P>
                    <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "110px 80px 55px 110px 1fr", gap: "12px", padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["Tier", "Score", "LTV", "Interest", "Notes"].map(h => <span key={h} style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{h}</span>)}
                        </div>
                        {[
                            ["PRIME", "#4ef2e8", "≥ 75", "70%", "Low", "Strong history (like the test wallet above at 89)"],
                            ["PREFERRED", "#a78bfa", "≥ 60", "60%", "Standard", "Solid on-chain track record"],
                            ["STANDARD", "#f59e0b", "≥ 45", "50%", "Higher", "Limited history or moderate risk"],
                            ["HIGH_RISK", "#fb923c", "≥ 30", "35%", "High", "Poor metrics — small credit line"],
                            ["REJECT", "#f87171", "< 30", "0%", "N/A", "No credit line issued"],
                        ].map(([tier, color, score, ltv, interest, note]) => (
                            <div key={tier} style={{ display: "grid", gridTemplateColumns: "110px 80px 55px 110px 1fr", gap: "12px", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                                <code style={{ fontSize: "12px", color: color as string, fontFamily: "monospace" }}>{tier}</code>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{score}</span>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{ltv}</span>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{interest}</span>
                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{note}</span>
                            </div>
                        ))}
                    </div>
                    <Note color="#f59e0b" icon="⚠️">
                        <strong style={{ color: "#f59e0b" }}>Note:</strong> A high tier doesn't guarantee a large loan. Max loan is capped by capital base (stablecoin inflow × retention ratio). A PRIME wallet with no stablecoin history may still get a small credit line.
                    </Note>

                    {/* ── LIFECYCLE ── */}
                    <SH id="lifecycle">Proof Lifecycle</SH>
                    <P>After <IC>analyzeWallet()</IC> completes, the <IC>RegistryWatcherService</IC> detects <IC>ScoreUpdated</IC> on Sepolia and starts the pipeline. This is what the real terminal output looked like step by step:</P>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "16px 0 20px" }}>
                        {[
                            { status: "not_found", color: "#64748b", desc: "Initial state — watcher hasn't detected ScoreUpdated yet" },
                            { status: "queued", color: "#94a3b8", desc: "Job created, about to start" },
                            { status: "checking_contract", color: "#7dd3fc", desc: "Verifying CreditScoreUSC has aggregator + authorized source set" },
                            { status: "fetching_tx", color: "#a78bfa", desc: "Fetching the Sepolia tx from RPC" },
                            { status: "waiting_attestation", color: "#f59e0b", desc: "Polling 0xFD3 precompile — waiting for Sepolia block to be attested on CreditCoin (10–30 min, blocksRemaining available)" },
                            { status: "generating_proof", color: "#4ef2e8", desc: "Calling proof-gen API to build the ZK Merkle proof" },
                            { status: "submitting", color: "#818cf8", desc: "Calling CreditScoreUSC.submitScoreFromQuery() on CreditCoin USC Testnet (chain ID 102036)" },
                            { status: "success", color: "#4ade80", desc: "Score verified and stored in CreditAggregator ✓ — txHash available" },
                            { status: "failed", color: "#f87171", desc: "Proof submission failed — re-analyze to retry" },
                        ].map(item => (
                            <div key={item.status} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: item.color }} />
                                <code style={{ fontSize: "12px", color: item.color, fontFamily: "monospace", minWidth: "185px", flexShrink: 0 }}>{item.status}</code>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{item.desc}</span>
                            </div>
                        ))}
                    </div>

                    <Note color="#4ef2e8" icon="💡">
                        <strong style={{ color: "#4ef2e8" }}>waiting_attestation</strong> is the longest stage. The SDK exposes <IC>blocksRemaining</IC> and <IC>estimatedWaitSeconds</IC> so you can show a live progress bar. In the real test above: 14 blocks (~168s) → 4 blocks (~48s) → submitting → success.
                    </Note>

                    {/* Footer */}
                    <div style={{ marginTop: "64px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>credgate-sdk v1.0.0 · MIT License</span>
                        <div style={{ display: "flex", gap: "16px" }}>
                            <a href="https://www.npmjs.com/package/credgate-sdk" target="_blank" rel="noreferrer"
                                style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>npm ↗</a>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}