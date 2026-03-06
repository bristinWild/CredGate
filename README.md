# CredGate

> On-chain credit & identity infrastructure — score wallets, anchor proofs to CreditCoin, lend without collateral

---

## What is CredGate?

CredGate turns a wallet's on-chain history into a cryptographically verified credit score. It analyses Aave lending behaviour, stablecoin treasury management, DEX activity, cross-chain presence, and wallet age — then compresses everything into a single 0–100 score that gets ZK-proved and permanently anchored to **CreditCoin USC** as a public, chain-agnostic identity fact.

**CredLend** is the first application built on top of it: an undercollateralized lending protocol where your behaviour is your collateral. But the infrastructure beneath it is general purpose. Once a proof lives on CreditCoin, any protocol on any chain can read it.

---

## Monorepo Structure

```
CredGate/
├── backend/          # NestJS scoring engine and ZK proof pipeline
├── contracts/        # Foundry smart contracts (Sepolia + CreditCoin USC)
├── credgate-sdk/     # TypeScript SDK for integrating CredGate into any protocol
├── frontend/         # Next.js dashboard and CredLend interface
└── .gitmodules
```

Each folder has its own README with full details on setup, architecture, and deployment. This document covers how they fit together.

---

## How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            User Flow                                      │
│                                                                           │
│  1. Connect wallet to dashboard                                           │
│  2. POST /wallet/analyze → backend fetches on-chain data                  │
│  3. Score computed, written to CreditScoreRegistry.sol (Sepolia)         │
│  4. RegistryWatcher catches ScoreUpdated event                            │
│  5. ZK proof pipeline starts (10–30 min, CreditCoin attestation wait)     │
│  6. Proof verified, score stored in CreditAggregator.sol (CreditCoin USC) │
│  7. CreditVault.sol reads from CreditAggregator → borrowing unlocked      │
└──────────────────────────────────────────────────────────────────────────┘
```

Steps 1–3 are fast (seconds). Step 6 is when borrowing is actually unlocked. The dashboard shows the score immediately after step 3 and tracks the ZK proof pipeline live through to step 6.

---

## Repos

### `backend/`

NestJS service that does the heavy lifting. Fetches data from Aave subgraphs, stablecoin transfer graphs, DEX activity, and cross-chain RPCs. Runs a multi-component scoring pipeline. Writes scores to Sepolia, then watches for the event and drives the ZK proof pipeline to CreditCoin.

**Key services:**
- `WalletProcessor` — orchestrates the full analysis job
- `ScoreService` / `RiskService` / `StableScoreService` / `MetricsService` — scoring components
- `CreditRegistryService` — writes to and reads from `CreditScoreRegistry.sol`
- `RegistryWatcherService` — watches Sepolia for `ScoreUpdated` events
- `ProofService` — 9-stage ZK proof state machine

**API:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/wallet/analyze/:address` | Trigger analysis |
| GET | `/wallet/result/:address` | Poll for result |
| GET | `/wallet/onchain/:address` | Sepolia registry status |
| GET | `/proof/status/address/:address` | ZK proof status |
| GET | `/proof/status/:jobId` | Proof status by job ID |

See [`backend/README.md`](./backend/README.md) for full scoring model, proof pipeline, and environment variables.

---

### `contracts/`

Foundry project. Five contracts split across two chains.

| Contract | Chain | Role |
|----------|-------|------|
| `CreditScoreRegistry.sol` | Sepolia | First-write score store, emits proof trigger events |
| `CredgateUSD.sol` (cdUSD) | Sepolia | 6-decimal stablecoin used as lending asset |
| `CreditVault.sol` | Sepolia | ERC4626 vault — undercollateralized lending, reads from CreditAggregator |
| `CreditScoreUSC.sol` | CreditCoin USC | ZK proof receiver, verifies Merkle proofs via precompile |
| `CreditAggregator.sol` | CreditCoin USC | Canonical multi-chain score store, global average across all chains |

**Deployed addresses (testnet):**

| Contract | Chain | Address |
|----------|-------|---------|
| CredgateUSD (cdUSD) | Sepolia | `0x47878958595E4F5CA7545ebCbDD35fE2FD9aD6BC` |
| CreditVault | Sepolia | `0x6f02C7BFd93050F014515FF407599dc8E651A17e` |
| CreditAggregator | CreditCoin USC (102036) | `0x04F3aBf34A59AB5e3F1555b678D256Fe8DfF9059` |

See [`contracts/README.md`](./contracts/README.md) for deployment order, contract interfaces, and Foundry commands.

---

### `credgate-sdk/`

TypeScript SDK for integrating CredGate into any lending protocol or application. Wraps the backend API with typed responses, automatic polling, configurable timeouts, and optional ZK proof waiting.

```typescript
import { CredGateClient } from 'credgate-sdk';

const client = new CredGateClient({ apiUrl: 'https://api.credgate.xyz' });
const result = await client.analyzeWallet('0xabc...', { waitForProof: true });

console.log(result.score.creditScore);   // 0–100
console.log(result.score.tier);          // "PRIME"
console.log(result.score.loanProfile);  // { maxLoanSizeUSD, recommendedLTV, interestTier }
```

See [`credgate-sdk/README.md`](./credgate-sdk/README.md) for full API reference.

---

### `frontend/`

Next.js 14 app with two surfaces:

**Dashboard** — full wallet analysis view. Shows the credit score ring, breakdown by component (lending, stable, DEX, cross-chain, age), executive summary, loan eligibility, Aave history, and a live ZK proof tracker with 9-stage progress through to CreditCoin confirmation.

**CredLend** — the lending interface. Borrow and Lend tabs. The borrow flow has three states: check score → wait for proof → borrow. The borrow button only enables when `proof.status === "success"` on CreditCoin, which is enforced by `CreditVault.sol` reading from `CreditAggregator.sol` — not just frontend logic.

**Stack:** Next.js 14 App Router, wagmi v2, RainbowKit, viem, Tailwind CSS, TypeScript.

**Chain config:**
- Sepolia (CreditScoreRegistry, CreditVault)
- CreditCoin USC Testnet (`id: 102036`, `rpc: https://rpc.usc-testnet2.creditcoin.network`)

See [`frontend/README.md`](./frontend/README.md) for component map, card-to-API mapping, and design system.

---

## Scoring Model

| Component | Max | Source |
|-----------|-----|--------|
| Lending history | 30 pts | Aave subgraph — repay ratio, cycle count, liquidation rate |
| Stablecoin treasury | 35 pts | Transfer graphs — net flow, retention, holding duration, source diversity |
| Cross-chain activity | 20 pts | Multi-chain RPCs + bridges |
| DEX maturity | 15 pts | Trading behaviour, router vs genuine trader detection |
| Age bonus | +10 pts | Log-scale wallet age |
| Risk penalty | up to −30 pts | Liquidations, burst activity, concentration risk |

**Tiers:**

| Score | Tier | Max Borrow | Interest |
|-------|------|-----------|----------|
| 95–100 | ELITE | $1,000 cdUSD | Prime |
| 80–94 | PRIME | $1,000 cdUSD | Prime |
| 65–79 | PREFERRED | $500 cdUSD | Preferred |
| 50–64 | STANDARD | $200 cdUSD | Standard |
| 30–49 | HIGH_RISK | Reduced | High |
| < 30 | REJECT | None | — |

Credit line thresholds (from `CreditVault.sol`): score ≥ 75 → $1,000, score ≥ 60 → $500, score ≥ 45 → $200.

---

## ZK Proof Pipeline

The proof is what makes the score trustless. Once a score is written to `CreditScoreRegistry.sol` on Sepolia, the backend generates a ZK Merkle proof that the score data exists in that transaction, then submits it to CreditCoin's precompile-backed verifier. This converts a backend claim into a cryptographic fact.

**9 stages:**
```
not_found → queued → checking_contract → fetching_tx → waiting_attestation
    → generating_proof → submitting → success / failed
```

The `waiting_attestation` stage (10–30 min) is the bottleneck — CreditCoin must attest the Sepolia block before a proof can be generated. The system polls precompile `0xFD3` and exposes `blocksRemaining` + `estimatedWaitSeconds` for live progress display.

---

## Why CreditCoin?

Most on-chain credit systems store scores on a single chain. That means every other chain either has to bridge the score (latency, trust assumptions) or ignore it.

CreditCoin's USC layer is designed specifically for cross-chain credit primitives. By anchoring scores there, we get a **chain-neutral truth layer** — any protocol on any EVM chain can call `CreditAggregator.getGlobalScore(address)` on CreditCoin and get a ZK-verified answer without trusting our backend.

The `CreditAggregator` multi-chain averaging is a further property: as a wallet accumulates verified scores from multiple chains, its `globalScore` is averaged across all of them. More chains = more data = more trustworthy score. A wallet with consistent behaviour across Ethereum, Arbitrum, and Optimism has a meaningfully different score from a wallet that only has history on one chain.

---

## Local Development

**Prerequisites:** Node.js 18+, Foundry, a Sepolia RPC URL (Alchemy or Infura), funded deployer wallets on both Sepolia and CreditCoin USC Testnet.

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/your-org/credgate
cd credgate

# Backend
cd backend && npm install && cp .env.example .env  # fill in RPC URLs and keys
npm run start:dev

# Frontend (in a new terminal)
cd frontend && npm install && cp .env.example .env.local
npm run dev

# Contracts
cd contracts && forge install && forge build
```

The backend runs on `localhost:3000`. The frontend runs on `localhost:3001`. CORS is pre-configured for this setup.

---

## Applications Beyond CredLend

CredLend is the demo. The infrastructure is general purpose. Once a score is on CreditCoin it's a public fact — you don't need our backend to use it.

**What you can build on top:**
- **Reputation-weighted governance** — vote weight = tokens × f(credit score)
- **Wallet-gated access** — NFT mints, allowlists, airdrop eligibility filtered by score
- **Dynamic insurance pricing** — use `riskScore` directly to price coverage premiums
- **Undercollateralized lending on any chain** — deploy your own vault, point it at `CreditAggregator` on CreditCoin
- **Sybil resistance** — proof of genuine on-chain participation, not just any funded wallet
- **RWA onboarding** — trustless baseline before off-chain KYC

If you're building on the score, the SDK (`credgate-sdk`) is the fastest path. If you want to read directly from the contracts, `CreditAggregator.getGlobalScore(address)` on CreditCoin USC is the single call you need.

---

## Contract Verification

All contracts are open source. After deployment, verify on their respective explorers:

```bash
# Sepolia
forge verify-contract $ADDRESS src/CreditScoreRegistry.sol:CreditScoreRegistry \
  --chain sepolia --etherscan-api-key $ETHERSCAN_API_KEY

# CreditCoin USC — use the explorer's verify flow directly
# https://explorer.usc-testnet2.creditcoin.network
```

---

## Contributing

Each sub-project follows its own conventions. Check the README in each folder before contributing.

- Contracts: Foundry test suite must pass — `forge test` before any PR
- Backend: services are tested independently; integration tests cover the full scoring pipeline
- SDK: all public methods must have TypeScript types and passing unit tests
- Frontend: component tests for anything touching contract reads or proof state

---

## Links

- CreditCoin USC Testnet Explorer: `https://explorer.usc-testnet2.creditcoin.network`
- CreditCoin USC RPC: `https://rpc.usc-testnet2.creditcoin.network`
- Chain ID: `102036`