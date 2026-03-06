# CredGate — Frontend

> Next.js interface for the CredGate credit scoring and lending platform

---

## What this is

This is the frontend for CredGate — a wallet credit scoring platform built on CreditCoin. It has two main surfaces: a **dashboard** that shows your full on-chain credit analysis, and **CredLend**, an undercollateralized lending protocol that uses that score to determine how much you can borrow without posting collateral.

The dashboard isn't just a number on a screen. It breaks down every signal that went into your score — your Aave lending history, stablecoin treasury behaviour, DEX maturity, cross-chain presence, and the live ZK proof status on CreditCoin. It's designed to be transparent about how creditworthiness is being evaluated, which matters if you want people to actually trust the system.

---

## Stack

- **Next.js 14** (App Router, `"use client"` where needed)
- **wagmi v2** + **RainbowKit** for wallet connection
- **viem** for contract interactions
- **Tailwind CSS** with CSS custom properties for theming
- **TypeScript** throughout

Connects to two chains: **Sepolia** (where `CreditScoreRegistry.sol` and `CreditVault.sol` live) and **CreditCoin USC Testnet** (chain ID `102036`, where `CreditAggregator.sol` stores verified scores).

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout — RainbowKit + Wagmi providers
│   ├── page.tsx                    # Landing page
│   │
│   ├── components/
│   │   └── Navbar/
│   │       └── Navbar.tsx          # Top nav — wallet connect, route links
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # Main dashboard — fetches wallet analysis, renders cards
│   │   ├── loading.tsx             # Loading skeleton while data fetches
│   │   ├── Dashboard.module.css    # Dashboard-specific styles
│   │   └── components/
│   │       ├── CreditScoreRing/
│   │       │   ├── CreditScoreRing.tsx         # Animated ring showing 0–100 score
│   │       │   └── CreditScoreRing.module.css
│   │       ├── CreditScoreBreakdown/
│   │       │   └── CreditScoreBreakdown.tsx    # Bar chart of lending/stable/dex/etc.
│   │       ├── ExecutiveSummary/
│   │       │   └── ExecutiveSummary.tsx        # Tier, max loan, LTV, risk level at a glance
│   │       ├── LoanDecisionCard/
│   │       │   └── LoanDecisionCard.tsx        # Loan eligibility, credit line, "Go to CredLend"
│   │       ├── LendingHistoryCard/
│   │       │   └── LendingHistoryCard.tsx      # Aave borrow/repay history, cycles, liquidations
│   │       ├── StableTreasuryIntelligence/
│   │       │   └── StableTreasuryIntelligence.tsx  # Stablecoin inflow/outflow, retention, holding days
│   │       ├── DexBehaviorIntelligence/
│   │       │   └── DexBehaviorIntelligence.tsx # DEX activity, maturity score, router vs trader
│   │       ├── CrossChainIntelligence/
│   │       │   └── CrossChainIntelligence.tsx  # Multi-chain presence, bridge activity
│   │       ├── RiskEngineAnalysis/
│   │       │   └── RiskEngineAnalysis.tsx      # Risk breakdown — liquidation rate, burst flags, etc.
│   │       └── OnChainStatusCard/
│   │           └── Onchainstatuscard.tsx       # Sepolia registry status + CreditCoin proof tracker
│   │
│   ├── credlend/
│   │   ├── page.tsx                # CredLend page — Borrow / Lend & Earn tabs
│   │   ├── BorrowTab.tsx           # Borrow against credit score, repay, proof pipeline
│   │   └── LendTab.tsx             # Deposit cdUSD, earn yield, withdraw
│   │
│   └── docs/
│       └── page.tsx                # SDK documentation page
│
└── lib/
    ├── contracts.ts                # Contract addresses + ABIs
    ├── wagmi.ts                    # Wagmi config — Sepolia + CreditCoin USC chains
    ├── CredgateUSD.sol/
    │   └── CredgateUSD.json        # cdUSD ABI
    └── CreditVault.sol/
        ├── CreditVault.json        # Vault ABI
        └── ICreditAggregator.json  # Aggregator interface ABI
```

---

## Pages

### `/dashboard`

The main credit analysis view. When you connect a wallet, it hits the backend `POST /wallet/analyze/:address` and polls until the job is done. All the dashboard cards render from that result.

The cards map directly to what the backend computes:

| Card | Data source |
|------|------------|
| `CreditScoreRing` | `intelligence.creditScore` — animated ring, tier color-coded |
| `ExecutiveSummary` | Tier, max loan, LTV, risk level — the tl;dr of your score |
| `CreditScoreBreakdown` | `intelligence.scoreBreakdown` — lending, stable, crossChain, dex, ageBonus, riskPenalty |
| `LoanDecisionCard` | `loanProfile.maxLoanSizeUSD`, `recommendedLTV`, `interestTier` — what you can actually borrow |
| `LendingHistoryCard` | Aave borrows, repays, liquidations, borrow-repay cycle count |
| `StableTreasuryIntelligence` | Stablecoin inflow/outflow, retention ratio, avg holding days, active months |
| `DexBehaviorIntelligence` | DEX maturity score, volume, router detection, swap patterns |
| `CrossChainIntelligence` | Chain activity, bridge usage, cross-chain maturity score |
| `RiskEngineAnalysis` | Liquidation rate, burst wallet detection, concentration risk |
| `OnChainStatusCard` | Sepolia `CreditScoreRegistry` status + live CreditCoin ZK proof tracker |

The `OnChainStatusCard` is where things get interesting — it shows the proof moving through all nine stages from `not_found` through `waiting_attestation` to `success`, with a live block countdown during the attestation wait. Users can see their score being anchored to CreditCoin in real time.

### `/credlend`

The lending interface. Two tabs:

**Borrow** — shows your credit line based on the verified score on `CreditAggregator.sol`, lets you borrow cdUSD up to your limit, and shows the full proof pipeline status while waiting for the ZK proof to complete. The borrow button has three states: analyze → proof pending → borrow enabled.

**Lend & Earn** — deposit cdUSD into `CreditVault.sol`, receive vault shares, earn yield from borrower interest. Shows your deposited balance, yield accumulated, and a withdraw flow.

### `/docs`

SDK documentation. Full reference for `credgate-sdk` — installation, API methods, React hooks, TypeScript types, proof lifecycle, credit tiers. Built as a Next.js page with a sticky sidebar, syntax-highlighted code blocks, and copy buttons.

---

## Chain Configuration

```typescript
// lib/wagmi.ts
export const creditcoinTestnet = defineChain({
    id: 102036,
    name: "CreditCoin USC Testnet",
    nativeCurrency: { name: "CreditCoin", symbol: "CTC", decimals: 18 },
    rpcUrls: {
        default: { http: ["https://rpc.usc-testnet2.creditcoin.network"] },
    },
    blockExplorers: {
        default: {
            name: "CreditCoin Explorer",
            url: "https://explorer.usc-testnet2.creditcoin.network",
        },
    },
    testnet: true,
});
```

The app needs both chains configured because some reads happen against Sepolia (`CreditScoreRegistry`, `CreditVault`) and the final score verification lives on CreditCoin USC (`CreditAggregator`). When users borrow from CredLend, the vault checks `CreditAggregator` on CreditCoin to gate access — meaning you need a valid ZK proof there before the contract lets you borrow. That's the whole point.

---

## Contract Addresses

```typescript
// lib/contracts.ts
export const CONTRACTS = {
    CDUSD:            "0x47878958595E4F5CA7545ebCbDD35fE2FD9aD6BC", // Sepolia
    CREDIT_VAULT:     "0x6f02C7BFd93050F014515FF407599dc8E651A17e", // Sepolia
    CREDIT_AGGREGATOR:"0x04F3aBf34A59AB5e3F1555b678D256Fe8DfF9059", // CreditCoin USC
} as const;
```

ABIs are imported directly from the Foundry build artifacts (`/lib/*.sol/*.json`). The `ICreditAggregator.json` is an interface ABI — only includes what the frontend needs to read from `CreditAggregator.sol` on CreditCoin.

---

## Environment Variables

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_API_URL=http://localhost:3000      # backend URL
```

The backend URL is used for all analysis calls. The frontend never calls Subgraph APIs directly — all that lives in the backend. The frontend just hits `POST /wallet/analyze/:address`, polls `GET /wallet/result/:address`, and calls `GET /proof/status/address/:address`.

---

## Running It

```bash
npm install
npm run dev      # starts on port 3001
```

The backend needs to be running on port 3000 first (it has CORS configured for `localhost:3001`). Connect a MetaMask wallet on Sepolia — the app will auto-detect and trigger analysis when you land on the dashboard.

---

## Design System

All colours run through CSS custom properties defined in `globals.css`:

```css
--color-bg:       #060a0f;          /* near-black background */
--color-surface:  rgba(255,255,255,0.03);
--color-border:   rgba(255,255,255,0.08);
--color-muted:    rgba(255,255,255,0.45);
--color-neon:     #4ef2e8;          /* teal accent — primary interactive colour */
--color-neon2:    #a78bfa;          /* purple accent */
```

The neon teal is used for all active states, score rings, badges, proof status indicators, and CTA buttons. The design is intentionally dark and minimal — meant to feel like infrastructure, not a retail product.

---

## How the Dashboard Connects to the Backend

1. User connects wallet
2. Dashboard calls `POST /wallet/analyze/:address` via `fetch`
3. Polls `GET /wallet/result/:address` every 3 seconds until `{ status: "DONE" }`
4. Result object (`intelligence`, `onchain`, `loanProfile`, etc.) is passed as props to each card component
5. `OnChainStatusCard` separately polls `GET /proof/status/address/:address` every 5 seconds to track the ZK proof lifecycle independently

The proof polling happens in parallel with displaying the score — you don't have to wait 30 minutes for the CreditCoin proof to see your score. The score is available as soon as the analysis job completes. The proof just adds the trustless verification layer on top.

---

## The Bigger Picture

The dashboard and CredLend are proof-of-concept applications for what CreditCoin-anchored identity enables. The score your wallet earns here isn't tied to CredGate — it's stored on CreditCoin's USC layer as a ZK-verified fact that any application can read.

We built CredLend to show the most obvious use case (undercollateralized lending) but the dashboard data tells a broader story. The breakdown of lending history, stablecoin treasury management, DEX behaviour, and cross-chain activity is a complete picture of what a wallet has done — not just whether it can repay a loan, but how it behaves as an on-chain participant.

Any application that wants to weight participation by reputation, gate access by wallet quality, or offer differential pricing based on risk profile can read from `CreditAggregator.sol` on CreditCoin. The frontend here is the reference implementation for how to display and interact with that data — but the data itself belongs to the wallet, not to us.

---

## Notes

- The dashboard triggers a new analysis every time you load the page if no cached result exists. If a result is cached (score already computed), it loads immediately without hitting the backend again.
- `BorrowTab.tsx` has a 3-state button flow: "Check Score" → "Waiting for proof" (with live countdown) → "Borrow". The borrow action only becomes available once the ZK proof reaches `success` on CreditCoin, because `CreditVault.sol` reads from `CreditAggregator` which only gets populated by the proof submission.
- The `loading.tsx` in `/dashboard` renders a skeleton layout matching the card grid — it shows while the initial analysis is running.
- ABIs live in `src/lib/` copied from the Foundry `out/` directory. If you redeploy contracts, copy the new ABIs and update the addresses in `contracts.ts`.