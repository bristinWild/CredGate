# credgate-sdk

On-chain credit scoring for onchain protocols, powered by CreditCoin ZK proofs.

Any onchain protocol can use this SDK to:
- Analyze a wallet's on-chain credit score
- Determine max loan size and interest tier
- Poll CreditCoin ZK proof status
- Gate loan disbursement by credit tier

> **API key required.** Generate yours free at [credgate.vercel.app/keys](https://credgate.vercel.app/keys) — connect your wallet and get a key in seconds.

---

## Installation

```bash
npm install credgate-sdk
```

---

## Get an API Key

1. Visit [credgate.vercel.app/get-api-key](https://credgate.vercel.app/get-api-key)
2. Connect your wallet (MetaMask, WalletConnect, or any EVM wallet)
3. Enter a project name and click **Generate API Key**
4. Copy your key — it's only shown once

Your key looks like: `cg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

Pass it as `apiKey` when initializing the client. All requests are authenticated via the `x-api-key` header automatically.

Rate limit: **100 requests/minute** per key.

---

## Quick Start

### Vanilla JS / Node.js

```typescript
import { CredGateClient } from "credgate-sdk";

const client = new CredGateClient({
  apiUrl: "https://api.credgate.xyz",
  apiKey: "cg_your_key_here",   // get yours at credgate.vercel.app/get-api-key
});

const result = await client.analyzeWallet("0xabc...123");

console.log(result.score.creditScore);                     // 87
console.log(result.score.tier);                            // "PRIME"
console.log(result.score.loanProfile.maxLoanSizeUSD);      // 25000
console.log(result.score.loanProfile.recommendedLTV);      // 70
console.log(result.score.loanProfile.interestTier);        // "PRIME"
console.log(result.proof?.status);                         // "waiting_attestation"
```

### React Hook

```tsx
import { CredGateClient } from "credgate-sdk";
import { useCredGate } from "credgate-sdk/react";
import { useAccount } from "wagmi";

// Create once — outside your component, or in a context
const client = new CredGateClient({
  apiUrl: "https://api.credgate.xyz",
  apiKey: "cg_your_key_here",   // get yours at credgate.vercel.app/get-api-key
});

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
  apiKey: "cg_your_key_here",           // required — get yours at credgate.vercel.app/get-api-key
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

---

### `client.getScore(address)`

Returns cached `ScoreResult | null`. Does NOT trigger new analysis.

```typescript
const score = await client.getScore("0x...");
if (!score) {
  await client.analyzeWallet("0x...");
}
```

---

### `client.getProofStatus(address)`

```typescript
const proof = await client.getProofStatus("0x...");
// { status: "waiting_attestation", blocksRemaining: 42, estimatedWaitSeconds: 504 }
```

---

### `client.waitForProof(address, options?)`

Polls until proof reaches `success` or throws on `failed`.

```typescript
const proof = await client.waitForProof("0x...", { timeout: 1_800_000 });
console.log(proof.txHash); // CreditCoin USC transaction hash
```

---

### `client.getOnChainStatus(address)`

```typescript
const status = await client.getOnChainStatus("0x...");
// { status: "UPDATED", txHash: "0x...", reportHash: "0x...", remainingSeconds: 0 }
```

---

### `client.isEligible(address)`

```typescript
if (!(await client.isEligible(userAddress))) {
  return res.status(403).json({ error: "Insufficient credit score" });
}
```

---

### `client.getMaxLoan(address)`

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
        const seconds = err.meta?.remainingSeconds as number;
        console.log(`Try again in ${Math.ceil(seconds / 3600)}h`);
        break;
      case ErrorCode.ANALYSIS_TIMEOUT:
        console.log("Timed out, retrying...");
        break;
      case ErrorCode.PROOF_FAILED:
        console.log("Proof failed:", err.meta?.txHash);
        break;
      case ErrorCode.WALLET_NOT_FOUND:
        console.log("Wallet never analyzed");
        break;
      case ErrorCode.UNAUTHORIZED:
        console.log("Invalid API key — get yours at credgate.vercel.app/get-api-key");
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
  analyze,            // () => Promise<void>
  refetch,            // () => Promise<void>
} = useCredGate(client, address, {
  autoAnalyze: false,
  proofPollInterval: 5000,
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

All endpoints require the `x-api-key` header. Requests without a valid key return `401 Unauthorized`.

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