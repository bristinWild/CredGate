# credgate-sdk

On-chain credit scoring for onchain-protocols, powered by CreditCoin ZK proofs.

Any onchain protocol can use this SDK to:
- Analyze a wallet's on-chain credit score
- Determine max loan size and interest tier
- Poll CreditCoin ZK proof status
- Gate loan disbursement by credit tier

---

## Installation

```bash
npm install credgate-sdk
```

---

## STEP By STEP GUIDE to integrate over a lending protocol.

## Architecture

```
Your Lending Protocol
        │
        ▼
  credgate-sdk  ──── POST /wallet/analyze/:address
        │        ──── GET  /wallet/result/:address
        │        ──── GET  /proof/status/address/:address
        │        ──── GET  /wallet/onchain/:address
        ▼
  CredGate Backend (NestJS)
        │
        ├── Aave history (Sepolia)
        ├── Stablecoin treasury analysis
        ├── CrossChain maturity
        ├── DEX activity
        ├── Wallet activity and age
        │
        ▼
  CreditScoreRegistry (Sepolia)
        │
        ▼ ZK Proof via CreditCoin SDK
  CreditScoreUSC (CreditCoin USC Testnet)
        │
        ▼
  CreditAggregator (CreditCoin USC Testnet)
        │
        ▼
  CreditVault.getCreditLine(user) → loan amount
```

---

## Quick Start

### Vanilla JS / Node.js

```typescript
import { CredGateClient } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: "https://your-credgate-backend.com",
  apiKey: "optional_api_key",
});

const result = await client.analyzeWallet("0xabc...123");

console.log(result.score.creditScore);              // 87
console.log(result.score.tier);                     // "PRIME"
console.log(result.score.loanProfile.maxLoanSizeUSD);  // 25000
console.log(result.score.loanProfile.recommendedLTV);  // 70
console.log(result.score.loanProfile.interestTier);    // "PRIME"
console.log(result.proof?.status);                  // "waiting_attestation"
```

### React Hook

```tsx
import { CredGateClient } from "credgate-sdk";
import { useCredGate } from "credgate-sdk/react";
import { useAccount } from "wagmi";

// Create once — outside your component, or in a context
const client = new CredGateClient({ apiUrl: "https://your-credgate-api.com" });

export function CreditWidget() {
  const { address } = useAccount();
  const {
    score,
    proof,
    onchain,
    loading,
    analyzing,
    error,
    cooldownRemaining,
    analyze,
  } = useCredGate(client, address);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Credit Score: {score?.creditScore ?? "—"}/100</h2>
      <p>Tier: {score?.tier}</p>
      <p>Max Loan: ${score?.loanProfile.maxLoanSizeUSD ?? 0}</p>
      <p>Recommended LTV: {score?.loanProfile.recommendedLTV}%</p>
      <p>Interest Tier: {score?.loanProfile.interestTier}</p>

      {proof && <p>Proof: {proof.status}</p>}
      {proof?.status === "waiting_attestation" && (
        <p>{proof.blocksRemaining} blocks remaining (~{proof.estimatedWaitSeconds}s)</p>
      )}
      {proof?.status === "success" && <p>✓ Verified on CreditCoin</p>}

      {onchain?.status === "UPDATED" && <p>✓ Score stored on-chain</p>}

      <button
        onClick={analyze}
        disabled={analyzing || cooldownRemaining > 0}
      >
        {analyzing
          ? "Analyzing..."
          : cooldownRemaining > 0
          ? `Cooldown: ${cooldownRemaining}s`
          : score
          ? "Re-analyze"
          : "Analyze Wallet"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

### Minimal hook (just eligibility)

```tsx
import { useSimpleScore } from "credgate-sdk/react";

function LoanGate({ address }: { address: string }) {
  const { eligible, tier, maxLoan, loading, analyze } = useSimpleScore(client, address);

  if (loading) return <Spinner />;
  if (!eligible) return <button onClick={analyze}>Check Eligibility</button>;

  return <p>You can borrow up to ${maxLoan} at {tier} tier</p>;
}
```

---

## Credit Tiers

| Tier | Score | LTV | Interest |
|---|---|---|---|
| `ELITE` | 95–100 | 70% | Lowest |
| `PRIME` | 80–94 | 70% | Low |
| `PREFERRED` | 65–79 | 60% | Standard |
| `STANDARD` | 50–64 | 50% | Higher |
| `HIGH_RISK` | 30–49 | 35% | High |
| `REJECT` | < 30 | 0% | N/A |

> **Note:** Loan size is also capped by capital base (stablecoin inflow × retention ratio). A high score does not guarantee a large loan — capital history matters.

---

## Proof Lifecycle

```
not_found
    │
    ▼
queued
    │
    ▼
checking_contract     ← verifies aggregator + authorized source set
    │
    ▼
fetching_tx           ← fetches Sepolia tx
    │
    ▼
waiting_attestation   ← polls 0xFD3 precompile on CreditCoin USC
    │                    (blocksRemaining, estimatedWaitSeconds available)
    ▼
generating_proof      ← calls proof-gen API
    │
    ▼
submitting            ← calls CreditScoreUSC.submitScoreFromQuery()
    │
    ├── success        ← txHash available (CreditCoin USC tx)
    └── failed         ← error message available
```

---

## API Reference

### `new CredGateClient(config)`

```typescript
const client = new CredGateClient({
  apiUrl: "https://api.credgate.xyz",   // required
  apiKey: "sk_...",                      // optional
  pollInterval: 3000,                    // ms between polls (default: 3000)
  timeout: 120_000,                      // analysis timeout ms (default: 120000)
});
```

---

### `client.analyzeWallet(address, options?)`

Triggers analysis and polls until score is ready. Returns full `AnalysisResult`.

```typescript
const result = await client.analyzeWallet("0x...", {
  waitForProof: true,     // also wait for CreditCoin ZK proof
  timeout: 180_000,       // override timeout
  pollInterval: 5000,     // override poll interval
});
```

**Response shape:**
```typescript
{
  "status": "DONE",
  "result": {
    "address": "0xa81a12e0c285b234a9c801b2bd215eabb3dda461",
    "basic": {
      "ethBalance": "0.0",
      "txCount": 0,
      "walletAgeBlocks": null
    },
    "aave": {
      "borrows": [],
      "repays": [],
      "liquidations": []
    },
    "meta": {
      "analyzedAt": 1772742968948
    },
    "intelligence": {
      "metrics": {
        "totalBorrows": 0,
        "totalRepays": 0,
        "totalLiquidations": 0,
        "repayRatio": 0,
        "liquidationRate": 0,
        "borrowRepayCycles": 0
      },
      "risk": {
        "riskScore": 60,
        "riskLevel": "MEDIUM"
      },
      "creditScore": 0,
      "scoreBreakdown": {
        "lending": 0,
        "stable": 0,
        "crossChain": 0,
        "dex": 0,
        "ageBonus": 0,
        "riskPenalty": 12
      },
      "stable": {
        "totalInflow": 0,
        "totalOutflow": 0,
        "netFlow": 0,
        "transferCount": 0,
        "inflowCount": 0,
        "outflowCount": 0,
        "avgMonthlyNetFlow": 0,
        "netFlowVolatility": 0,
        "retentionRatio": 0,
        "recentActivityScore": 0,
        "activeMonths": 0,
        "avgHoldingDays": 0,
        "largestInflowSourceShare": 0,
        "churnRatio": 0,
        "stableScore": 0,
        "stableLevel": "WEAK"
      },
      "crossChain": {
        "chainsUsedCount": 0,
        "activeChains": [],
        "totalTxAcrossChains": 0,
        "chainDetails": [
          {
            "chain": "ethereum",
            "txCount": 0,
            "firstTxBlock": null,
            "walletAgeDays": null
          },
          {
            "chain": "arbitrum",
            "txCount": 0,
            "firstTxBlock": null,
            "walletAgeDays": null
          },
          {
            "chain": "optimism",
            "txCount": 0,
            "firstTxBlock": null,
            "walletAgeDays": null
          },
          {
            "chain": "base",
            "txCount": 0,
            "firstTxBlock": null,
            "walletAgeDays": null
          },
          {
            "chain": "polygon",
            "txCount": 0,
            "firstTxBlock": null,
            "walletAgeDays": null
          }
        ],
        "crossChainMaturityScore": 0,
        "crossChainRiskImpact": 10
      },
      "dex": {
        "totalSwaps": 0,
        "totalVolumeUSD": 0,
        "uniqueTokensTraded": 0,
        "avgSwapSizeUSD": 0,
        "swapFrequencyPerMonth": 0,
        "dexMaturityScore": 0,
        "dexRiskImpact": 0
      },
      "loanProfile": {
        "recommendedLTV": 0,
        "interestTier": "REJECT",
        "maxLoanSizeUSD": 0
      }
    },
    "onchain": {
      "status": "UPDATED",
      "txHash": "0x8f4b45d041e6d4a502407f8dd5fda49e73d882136db7e2d25096e1269cb211fd",
      "reportHash": "0xf44b9f3a31ac3bb921289f6823b523ad01f3df9f543d01a573aab3c0bdb9386b"
    }
  }
}
```

---

### `client.getScore(address)`

Returns cached `ScoreResult | null`. Does NOT trigger new analysis.

```typescript
const score = await client.getScore("0x...");
if (!score) {
  // Wallet never analyzed — trigger analysis
  await client.analyzeWallet("0x...");
}
```

---

### `client.getProofStatus(address)`

Returns current ZK proof status for a wallet.

```typescript
const proof = await client.getProofStatus("0x...");
// { status: "waiting_attestation", blocksRemaining: 42, estimatedWaitSeconds: 504 }
```

---

### `client.waitForProof(address, options?)`

Polls until proof reaches `success` or throws on `failed`.

```typescript
const proof = await client.waitForProof("0x...", {
  timeout: 1_800_000,   // 30 min (matches backend max)
});
console.log(proof.txHash); // CreditCoin USC transaction hash
```

---

### `client.getOnChainStatus(address)`

Returns on-chain credit registry status from Sepolia `CreditScoreRegistry`.

```typescript
const status = await client.getOnChainStatus("0x...");
// { status: "UPDATED", txHash: "0x...", reportHash: "0x...", remainingSeconds: 0 }
```

---

### `client.isEligible(address)`

Quick boolean check. Returns `false` if tier is REJECT or maxLoanSizeUSD is 0.

```typescript
// Server-side loan gating
if (!(await client.isEligible(userAddress))) {
  return res.status(403).json({ error: "Insufficient credit score" });
}
```

---

### `client.getMaxLoan(address)`

Returns max loan in USD. Returns 0 if wallet is ineligible or unanalyzed.

```typescript
const max = await client.getMaxLoan(userAddress);
if (requestedAmount > max) {
  throw new Error(`Requested ${requestedAmount} exceeds credit line of ${max}`);
}
```

---

## Error Handling

```typescript
import { CredGateClient, CredGateError, ErrorCode } from "credgate-sdk";

try {
  await client.analyzeWallet(address);
} catch (err) {
  if (err instanceof CredGateError) {
    switch (err.code) {
      case ErrorCode.COOLDOWN_ACTIVE:
        // Wallet was analyzed recently — wait for cooldown
        const seconds = err.meta?.remainingSeconds as number;
        console.log(`Try again in ${Math.ceil(seconds / 3600)}h`);
        break;

      case ErrorCode.ANALYSIS_TIMEOUT:
        // Backend took too long — retry
        console.log("Timed out, retrying...");
        break;

      case ErrorCode.PROOF_FAILED:
        // CreditCoin proof submission failed
        console.log("Proof failed:", err.meta?.txHash);
        break;

      case ErrorCode.WALLET_NOT_FOUND:
        console.log("Wallet never analyzed");
        break;

      case ErrorCode.UNAUTHORIZED:
        console.log("Check your API key");
        break;

      case ErrorCode.NETWORK_ERROR:
        console.log("Backend unreachable:", err.message);
        break;
    }
  }
}
```

---

## React Hook Reference

### `useCredGate(client, address, options?)`

```typescript
const {
  score,              // ScoreResult | null
  proof,              // ProofStatus | null
  onchain,            // OnChainStatus | null
  loading,            // true while fetching cached data on mount
  analyzing,          // true while analysis job is running
  error,              // string | null
  cooldownRemaining,  // number (seconds, counts down)
  analyze,            // () => Promise<void>  — trigger new analysis
  refetch,            // () => Promise<void>  — reload cached data
} = useCredGate(client, address, {
  autoAnalyze: false,      // trigger analysis on mount if no cached score
  proofPollInterval: 5000, // poll proof every 5s (0 = disabled)
});
```

### `useSimpleScore(client, address)`

```typescript
const {
  creditScore,       // number | null
  tier,              // CreditTier | null
  maxLoan,           // number (USD)
  recommendedLTV,    // number (0–70)
  eligible,          // boolean
  loading,
  error,
  cooldownRemaining,
  analyze,
} = useSimpleScore(client, address);
```

---

## TypeScript Types

```typescript
import type {
  AnalysisResult,
  ScoreResult,
  LoanProfile,
  ScoreBreakdown,
  ProofStatus,
  ProofStatusValue,
  OnChainStatus,
  OnChainStatusValue,
  CreditTier,
  RiskLevel,
} from "credgate-sdk";
```

---

## Backend Endpoints Used

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/wallet/analyze/:address` | Trigger wallet analysis |
| `GET` | `/wallet/result/:address` | Poll for score result |
| `GET` | `/wallet/onchain/:address` | On-chain registry status |
| `GET` | `/proof/status/address/:address` | ZK proof status by address |
| `GET` | `/proof/status/:jobId` | ZK proof status by job ID |

---

## Score Breakdown Explained

| Component | Max Points | Source |
|---|---|---|
| Lending | 30 | Aave borrow/repay history, liquidations |
| Stable | 35 | Stablecoin treasury inflow/retention/age |
| CrossChain | 20 | Multi-chain activity maturity |
| DEX | 15 | DEX swap history and volume |
| Age Bonus | 10 | Wallet age (log scale) |
| Risk Penalty | −30 | Combined risk score deduction |

---

## License

MIT
