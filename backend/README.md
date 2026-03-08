# CredGate — Backend

> On-chain Credit & Identity scoring infrastructure powered by CreditCoin

---

## What is this?

CredGate is a backend service that analyzes EVM wallet history, computes a credit score, and anchors that score to CreditCoin as a permanent, Merkle-verified on-chain fact. We built CredLend (our undercollateralized lending protocol) on top of it as the first demo — but the infrastructure underneath is general purpose.

The core idea: **your on-chain behaviour is your identity**. Instead of asking who you are, we ask what you've done. Aave borrows, stablecoin treasury management, DEX maturity, cross-chain presence — all of it gets distilled into a single score that gets cryptographically verified and stored on CreditCoin. Any chain, any application can then read that score and trust it, because the proof lives on CreditCoin's USC layer — not on our server.

---

## Why CreditCoin?

Most "on-chain credit" projects store their scores on the same chain they serve. That means every protocol that wants to use the score has to either be on that chain, bridge it themselves, or trust some off-chain oracle. That's messy.

We took a different approach. CreditCoin was built specifically for credit primitives. Its USC (Universal Smart Contract) layer gives us a place to anchor scores that is chain-agnostic by design. When we submit a proof to CreditCoin USC, we're not just storing a number — we're registering an identity fact that any chain can reference.

**CreditCoin becomes the truth layer for on-chain identity.** Ethereum can query it. Solana can bridge it. Any new L2 can read from it on day one without needing its own credit history. The score travels with the wallet, not with the chain.

The Merkle proof pipeline makes this trustless. We don't ask anyone to believe our backend computed the score correctly. We generate a Merkle proof of the on-chain data, submit it to `CreditScoreUSC.sol` on CreditCoin, and it gets verified and stored in `CreditAggregator.sol`. From that point on the score is a cryptographic fact, not a centralized claim.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NestJS Backend                        │
│                                                              │
│  WalletController  ─────►  WalletProcessor                  │
│       │                        │                            │
│       │               ┌────────┴────────┐                   │
│       │               ▼                 ▼                   │
│       │         Subgraph APIs      On-chain RPCs            │
│       │         (Aave, DEX)        (Sepolia, etc.)          │
│       │               │                 │                   │
│       │               └────────┬────────┘                   │
│       │                        ▼                            │
│       │              Intelligence Layer                      │
│       │         MetricsService  │  RiskService               │
│       │         StableScoreService  │  ScoreService          │
│       │                        │                            │
│       │                        ▼                            │
│       │              CreditRegistryService                   │
│       │         (writes to CreditScoreRegistry.sol           │
│       │          on Sepolia, emits ScoreUpdated)             │
│       │                        │                            │
│       ▼                        ▼                            │
│  ProofController    RegistryWatcherService                   │
│       │             (watches ScoreUpdated events)            │
│       │                        │                            │
│       ▼                        ▼                            │
│  ProofService ◄────────────────┘                            │
│  (Merkle proof pipeline)                                        │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
   ┌──────────────────────┐         ┌────────────────────────┐
   │   Sepolia Testnet     │         │   CreditCoin USC        │
   │                      │         │                         │
   │  CreditScoreRegistry ├────────►│  CreditScoreUSC.sol     │
   │  .sol                │  Merkle     │  CreditAggregator.sol   │
   │  (ScoreUpdated event)│  proof  │  (final truth store)    │
   └──────────────────────┘         └────────────────────────┘
```

### Request flow

1. Client calls `POST /wallet/analyze/:address`
2. `WalletProcessor` kicks off a job — fetches Aave data via subgraph, stablecoin transfers, DEX activity, cross-chain presence
3. `MetricsService` builds raw metrics. `RiskService` computes a 0–100 risk score. `StableScoreService` scores the stablecoin treasury. `ScoreService` combines everything into a final credit score with breakdown
4. Score gets written to `CreditScoreRegistry.sol` on Sepolia — this emits a `ScoreUpdated` event
5. `RegistryWatcherService` detects the `ScoreUpdated` event on Sepolia and hands it to `ProofService`
6. `ProofService` tracks the Sepolia block through CreditCoin's attestation precompile (0xFD3), generates a Merkle Merkle proof of the score data, and submits it to `CreditScoreUSC.sol` on CreditCoin USC
7. `CreditAggregator.sol` on CreditCoin stores the final verified score — this is the canonical truth

Clients poll `GET /wallet/result/:address` until the job is done, then optionally poll `GET /proof/status/address/:address` to track the Merkle proof through to completion.

---

## Smart Contracts

### On Sepolia

**`CreditScoreRegistry.sol`**
The staging layer. Our scorer writes scores here. Has a configurable cooldown (default 5 minutes) to prevent spam. Emits `ScoreUpdated` events that trigger the proof pipeline.

```
scores[address] → { creditScore, riskScore, stableScore, reportHash, updatedAt }
```

**`CredgateUSD.sol` (cdUSD)**
Our stablecoin. 6 decimals, mintable by owner. Used as the borrowing asset in CredLend. Keeps things simple during testnet.

**`CreditVault.sol`**
The lending vault. Lenders deposit cdUSD, borrowers draw from their credit lines. Credit lines are gated by the score on CreditAggregator — if you don't have a verified proof on CreditCoin, you can't borrow.

### On CreditCoin USC (chain ID 102036)

**`CreditScoreUSC.sol`**
Receives Merkle proof submissions. Calls `CreditAggregator` to store the verified score. Needs an authorized source (our Sepolia registry address) and an aggregator address set before it'll accept submissions.

**`CreditAggregator.sol`**
The canonical truth store on CreditCoin. Stores per-chain reports and computes a global score across all chains a wallet has been scored on. This is what external protocols read when they want to verify a wallet's credit.

```
reports[address][chainKey] → ChainReport
globalScore[address] → averaged across all supported chains
```

The multi-chain averaging in `CreditAggregator` is worth noting — as more chains submit scores for the same wallet, the global score becomes more accurate. A wallet with consistent behaviour on Ethereum, Arbitrum, and Polygon will have a more trustworthy score than one that only has history on one chain.

---

## Scoring Model

The score runs 0–100. Here's how it breaks down:

| Component | Max Points | What it measures |
|-----------|-----------|-----------------|
| Lending | 30 | Aave borrow/repay history, liquidation rate, cycle count |
| Stablecoin Treasury | 35 | Net flow, retention ratio, holding duration, source diversity |
| Cross-Chain | 20 | Multi-chain maturity, bridge activity |
| DEX Activity | 15 | Trading maturity, not just volume |
| Age Bonus | +10 | Log-scale wallet age (rewards longevity) |
| Risk Penalty | -30 | Deducted based on risk score |

**Risk score** is computed separately by `RiskService` — it looks at liquidation rates, suspicious burst activity, stablecoin concentration, cross-chain risk flags, and DEX behavior. High risk score = big penalty to the final credit score.

**Tiers:**

| Score | Tier | LTV | Notes |
|-------|------|-----|-------|
| 95–100 | ELITE | 70% | |
| 80–94 | PRIME | 70% | |
| 65–79 | PREFERRED | 60% | |
| 50–64 | STANDARD | 50% | |
| 30–49 | HIGH_RISK | 35% | |
| < 30 | REJECT | 0% | No credit line |

Max loan size is the wallet's stablecoin capital base × LTV. A PRIME wallet with no stablecoin history still gets a small or zero credit line — the tier sets the rate, the capital base sets the ceiling.

---

## Merkle Proof Pipeline

This is the most complex part of the system and the bit that makes it actually trustless.

Once a score is written to `CreditScoreRegistry.sol` on Sepolia, `RegistryWatcherService` catches the `ScoreUpdated` event and creates a proof job. `ProofService` tracks the job through these stages:

```
not_found
    └─► queued
            └─► checking_contract        (verify CreditScoreUSC is configured)
                    └─► fetching_tx      (get the Sepolia tx from RPC)
                            └─► waiting_attestation    (poll 0xFD3 precompile until
                            │                          Sepolia block is attested
                            │                          on CreditCoin — 10-30 min)
                            └─► generating_proof       (call proof-gen API to build
                            │                          Merkle Merkle proof)
                            └─► submitting             (call CreditScoreUSC
                            │                          .submitScoreFromQuery())
                            ├─► success                (txHash on CreditCoin)
                            └─► failed
```

The waiting_attestation stage is the slow one. CreditCoin's precompile at `0xFD3` tells us the latest Sepolia block that's been attested on CreditCoin. We need our specific Sepolia block to be attested before the proof can be generated. This typically takes 10–30 minutes. The service exposes `blocksRemaining` and `estimatedWaitSeconds` so clients can show meaningful progress.

**To enable automatic proof generation**, uncomment these lines in `main.ts`:

```typescript
const watcher = app.get(RegistryWatcherService);
await watcher.runCatchUp();
```

They're commented out by default so you can run the backend without the watcher if you're just testing the scoring pipeline.

---

## Backend Folder Structure

```
src/
├── app.module.ts
├── main.ts
│
├── wallet/
│   ├── wallet.controller.ts      # POST /wallet/analyze, GET /wallet/result, /onchain
│   ├── wallet.processor.ts       # job runner — orchestrates the full analysis
│   └── wallet.module.ts
│
├── scoring/
│   ├── score.service.ts          # combines all signals into final 0-100 score
│   ├── risk.service.ts           # risk evaluation (liquidations, burst activity, etc.)
│   ├── metrics.service.ts        # raw Aave metrics (borrows, repays, liquidations)
│   ├── stable-score.service.ts   # stablecoin treasury scoring
│   └── score-weights.ts          # multipliers and caps for each component
│
├── blockchain/
│   ├── credit-registry.service.ts   # reads/writes CreditScoreRegistry.sol on Sepolia
│   ├── stablecoin-treasury/
│   │   └── stablecoin-treasury.service.ts
│   └── ...
│
├── cron/
│   └── registry-watcher.service.ts  # watches ScoreUpdated events → triggers proofs
│
└── proof/
    ├── proof.controller.ts    # GET /proof/status/:jobId, /proof/status/address/:address
    ├── proof.service.ts       # Merkle proof pipeline state machine
    └── proof.module.ts
```

---

## Environment Variables

```bash
# Sepolia
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
SCORER_PRIVATE_KEY=0x...          # wallet that calls CreditScoreRegistry.updateScore()

# CreditCoin USC
CREDITCOIN_RPC_URL=https://rpc.usc-testnet2.creditcoin.network
CREDITCOIN_PRIVATE_KEY=0x...      # wallet that calls CreditScoreUSC.submitScoreFromQuery()

# Contract addresses
CREDIT_SCORE_REGISTRY=0x...       # Sepolia
CREDIT_SCORE_USC=0x...            # CreditCoin USC
CREDIT_AGGREGATOR=0x...           # CreditCoin USC
CREDIT_VAULT=0x...                # Sepolia (lending vault)

# Subgraphs
AAVE_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/aave/...

# Proof generation
PROOF_GEN_API_URL=https://...     # the Merkle proof generation service
```

---

## Running It

```bash
npm install
npm run start:dev
```

The server starts on port 3000. CORS is currently configured for `http://localhost:3001` (the Next.js frontend). Update `main.ts` if you're deploying elsewhere.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/wallet/analyze/:address` | Trigger wallet analysis |
| GET | `/wallet/result/:address` | Poll for analysis result |
| GET | `/wallet/onchain/:address` | Get Sepolia registry status |
| GET | `/proof/status/address/:address` | Get proof status by wallet address |
| GET | `/proof/status/:jobId` | Get proof status by job ID |
| POST | `/proof/verify` | Manually trigger proof for a tx hash |

---

## Beyond Lending

CredLend is the first application we built but it's honestly just a demo of what this infrastructure can do. The score we generate and anchor to CreditCoin is general-purpose identity data. A few directions this could go:

**Undercollateralized lending** (what we built) — gate loan sizes and interest rates by score. Replace over-collateralization with real creditworthiness.

**DAO governance weight** — instead of pure token-weighted voting, weight votes partially by on-chain reputation. A wallet with 3 years of clean Aave history and active cross-chain participation probably deserves more governance influence than a freshly funded whale.

**NFT / allowlist access** — mint-gated collections or token sales where eligibility is based on wallet quality rather than just holding another NFT. Sybil resistance with nuance.

**Insurance pricing** — protocols like Nexus Mutual could use the risk score component directly to price coverage premiums. High-risk wallets pay more, low-risk wallets get discounted coverage.

**RWA onboarding** — real-world asset platforms that need to vet participants. The score doesn't replace KYC but it gives platforms a trustless baseline of on-chain behaviour before any off-chain checks happen.

**Cross-chain reputation** — as more chains submit scores for the same wallet to `CreditAggregator`, the global score becomes a chain-agnostic measure of wallet quality. An L2 launching tomorrow can immediately offer reputation-gated features without waiting years for its own user base to build history.

The point is: once a proof lives on CreditCoin, it's not our data anymore. It's a public fact that anyone can read. We're building toward a world where your on-chain identity follows you everywhere — you earn it on Ethereum, you use it on Solana, and neither chain needs to trust the other or our backend. They just read from CreditCoin.

---

## Contract Addresses (Testnet)

| Contract | Chain | Address |
|----------|-------|---------|
| CreditScoreRegistry | Sepolia | `0x47d3adBB126AB13E1b6a4f76D13927E16bA14817` |
| CredgateUSD (cdUSD) | Sepolia | `0x47878958595E4F5CA7545ebCbDD35fE2FD9aD6BC` |
| CreditVault | Sepolia | `0x6f02C7BFd93050F014515FF407599dc8E651A17e` |
| CreditAggregator | CreditCoin USC | `0x04F3aBf34A59AB5e3F1555b678D256Fe8DfF9059` |
| CreditScoreUSC | CreditCoin USC | `0x620431B91db7a499eeC0eC9a4c817dA3B5A90861` |

CreditCoin USC Testnet chain ID: `102036`
Explorer: `https://explorer.usc-testnet2.creditcoin.network`

---

## SDK

If you want to integrate CredGate into your own protocol, there's an SDK:

```bash
npm install credgate-sdk
```

It wraps all the polling and error handling so you don't have to. See the SDK docs at `https://www.npmjs.com/package/credgate-sdk` or the `/docs` page in the frontend.

---

## Notes / Known Issues

- The proof pipeline stores jobs in memory — if the server restarts mid-proof, jobs are lost. A proper implementation would persist job state to a database. For testnet this is fine.
- `updateCooldown` in `CreditScoreRegistry.sol` is set to 5 minutes. This is intentionally short for testing — in production you'd want 24 hours minimum.
- The stablecoin treasury service currently tracks USDC, USDT, and DAI. More tokens can be added in the stablecoin-treasury service config.
- Cross-chain data comes from multiple subgraphs. If a subgraph is slow or down, that component of the score will fall back to 0 rather than failing the whole job.