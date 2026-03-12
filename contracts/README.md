# CredGate — Contracts

> Foundry project containing all smart contracts for the CredGate credit scoring and lending system

---

## What's here

Five contracts split across two chains. One live on **Sepolia** (staging registry) and 4 live on **CreditCoin USC Testnet** (CreditVault, CredgateUSD , the cross-chain proof receiver and global score aggregator). Together they form the on-chain half of the CredGate system — the backend scores wallets and writes to these contracts, and any application that wants to read a wallet's credit score can read from them.

---

## Folder Structure

```
contracts/
├── src/
│   ├── CredgateUSD.sol           # cdUSD — 6-decimal ERC20 stablecoin (CreditCoin USC)
│   ├── CreditScoreRegistry.sol   # On-chain score store with cooldown (Sepolia)
│   ├── CreditVault.sol           # Undercollateralized lending vault (CreditCoin USC)
│   ├── CreditScoreUSC.sol        # Merkle proof receiver — writes to Aggregator (CreditCoin USC)
│   └── CreditAggregator.sol      # Cross-chain global score store (CreditCoin USC)
├── test/
│   └── ...                       # Foundry tests
├── script/
│   └── ...                       # Deployment scripts
├── lib/
│   └── ...                       # Dependencies (OpenZeppelin, etc.)
├── out/
│   └── ...                       # Compiled artifacts — ABIs copied to frontend/lib
├── foundry.toml
├── remappings.txt
└── .env
```

---

## Contracts

### `CredgateUSD.sol` — CreditCoin USC

The protocol stablecoin. Standard ERC20 with 6 decimals (matching USDC conventions), ownable mint/burn, and pausable transfers. The backend mints cdUSD to borrowers when a loan is approved, and `CreditVault` burns it on repayment.

```
Symbol:   cdUSD
Decimals: 6
Network:  CreditCoin USC
Address:  0x47878958595E4F5CA7545ebCbDD35fE2FD9aD6BC
```

Key points: `mint()` is `onlyOwner` — only `CreditVault` should be set as owner in production. The `decimals()` override returning 6 is intentional; the rest of the system assumes 6-decimal amounts throughout.

---

### `CreditScoreRegistry.sol` — Sepolia

The primary on-chain truth store for wallet credit scores on Sepolia. The backend's scoring pipeline writes here immediately after computing a score. Any on-chain application on Sepolia can read a wallet's score directly from this contract without going through the backend.

```
Network:  Sepolia
Address:  (set at deployment)
```

**Storage per wallet:**

```solidity
struct CreditData {
    uint256 creditScore;      // 0–100
    uint256 riskScore;        // 0–100
    uint256 stableScore;      // 0–100
    uint256 scoringVersion;   // version of scoring algorithm used
    uint256 updatedAt;        // timestamp of last update
    bytes32 reportHash;       // keccak256 of full analysis result
}
```

**Cooldown:** `updateCooldown` is set to 5 minutes in the contract (should be 24 hours in production — the backend has its own cooldown logic but the contract enforces it on-chain as well). Any call to `updateScore()` before the cooldown expires reverts with `"Update cooldown active"`.

**Access:** Only the `scorer` address (the backend's hot wallet) can call `updateScore()`. The scorer can rotate itself via `setScorer()` and adjust the cooldown via `setCooldown()`.

**Reading a score:**

```solidity
CreditScoreRegistry registry = CreditScoreRegistry(REGISTRY_ADDRESS);
CreditScoreRegistry.CreditData memory data = registry.getScore(userAddress);
// data.creditScore  → 0–100
// data.updatedAt    → unix timestamp, 0 if never scored
```

---

### `CreditVault.sol` — CreditCoin USC

The undercollateralized lending vault. Depositors provide cdUSD liquidity and earn yield; borrowers draw from that liquidity based on their credit score from `CreditAggregator` on CreditCoin USC (not from the Sepolia registry directly — the vault trusts the CreditCoin-verified global score).

```
Network:  CreditCoin USC
Address:  0x6f02C7BFd93050F014515FF407599dc8E651A17e
```

The vault reads `CreditAggregator.getGlobalScore()` on CreditCoin to determine how much a wallet can borrow. This is the load-bearing reason for the CreditCoin integration — the vault requires a Merkle-verified cross-chain proof before allowing a borrow, not just a locally-written score. A wallet that scored well on Sepolia but never got its proof submitted to CreditCoin USC can't borrow from the vault.

Credit line is determined by: `globalScore → tier → LTV % → maxLoanSizeUSD → creditLine in cdUSD (6 decimals)`.

---

### `CreditScoreUSC.sol` — CreditCoin USC Testnet (chain ID 102036)

The cross-chain proof receiver. This is the entry point for Merkle proofs submitted by the backend's proof service. When a Sepolia score gets attested and a proof is generated, it's submitted here. This contract verifies the proof and calls `CreditAggregator.updateChainReport()` to store the result.

```
Network:  CreditCoin USC Testnet (chain ID 102036)
```

The proof submission flow:
1. Backend writes score to `CreditScoreRegistry` on Sepolia
2. Backend monitors `RegistryWatcherService` for the `ScoreUpdated` event
3. Proof service picks up the tx and enters the 9-stage pipeline
4. During `waiting_attestation`, it polls CreditCoin's precompile at `0xFD3` until the Sepolia block containing the tx is attested
5. Once attested, it generates a Merkle proof and calls `CreditScoreUSC.submitProof()` (or equivalent)
6. `CreditScoreUSC` verifies and forwards to `CreditAggregator`

---

### `CreditAggregator.sol` — CreditCoin USC Testnet (chain ID 102036)

The canonical cross-chain score store. Receives verified per-chain reports from `CreditScoreUSC` and maintains both per-chain records and a global average score across all chains a wallet has been scored on.

```
Network:  CreditCoin USC Testnet (chain ID 102036)
Address:  0x04F3aBf34A59AB5e3F1555b678D256Fe8DfF9059
```

**Per-chain storage:**

```solidity
struct ChainReport {
    uint256 creditScore;
    uint256 riskScore;
    uint256 stableScore;
    uint256 scoringVersion;
    bytes32 reportHash;
    uint256 updatedAt;
    bool exists;
}

// wallet → chainKey → report
mapping(address => mapping(uint64 => ChainReport)) public reports;
```

**Global score:** When a new chain report is stored, `_recomputeGlobal()` recalculates the average across all chains where the wallet has a report. This average is what `CreditVault` reads when determining borrow eligibility.

```solidity
function getGlobalScore(address user) external view returns (uint256)
```

**Chain keys:** Chains are registered via `addSupportedChain(uint64 chainKey)`. The `chainKey` is typically the EVM chain ID cast to `uint64`. Sepolia is chain `11155111`. New chains can be added by admin as the system expands.

**Access:** Only `usc` (the `CreditScoreUSC` contract address) can call `updateChainReport()`. Admin can rotate the USC address and add new supported chains.

**Why this design matters:** As more chains run CredGate scoring infrastructure and submit proofs to CreditCoin USC, a wallet's `globalScore` improves because it's averaged over more data points. A wallet active on Ethereum + Arbitrum + Base that gets scored on all three will have a higher-confidence global score than one scored only on Sepolia. The aggregator makes the score inherently multi-chain without any single chain being authoritative.

---

## Deployment Order

These contracts have dependencies between them, so deploy in this order:

**Sepolia:**
1. `CreditScoreRegistry` — pass `_scorer` (backend hot wallet)


**CreditCoin USC:**
2. `CredgateUSD` — pass `initialOwner` (backend deployer wallet initially, transfer to vault after)
3. `CreditVault` — needs `CreditAggregator` address on CreditCoin USC
4. `CreditAggregator` — pass `_usc` (zero address initially) and `_chains` (e.g., `[11155111]` for Sepolia)
5. `CreditScoreUSC` — pass `CreditAggregator` address

**Back on CreditCoin USC:**
6. Call `CreditAggregator.setUSC(CreditScoreUSC_address)` to wire them together
7. Configure `CreditVault` with `CreditAggregator` address on CreditCoin USC
8. Transfer `CredgateUSD` ownership to `CreditVault`

---

## Environment Variables

```bash
# .env
PRIVATE_KEY=0x...                          # deployer wallet
SEPOLIA_RPC_URL=https://...
CREDITCOIN_RPC_URL=https://rpc.usc-testnet2.creditcoin.network
ETHERSCAN_API_KEY=...                      # for Sepolia verification
```

---

## Build & Test

```bash
forge build
forge test
forge test -vvv                            # verbose test output
```

**Deploy to Sepolia:**
```bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

**Deploy to CreditCoin USC:**
```bash
forge script script/DeployUSC.s.sol --rpc-url $CREDITCOIN_RPC_URL --broadcast
```

After deployment, copy the new ABIs from `out/` to the frontend's `src/lib/` directory and update the addresses in `src/lib/contracts.ts`.

---

## Notes

**Cooldown in `CreditScoreRegistry`:** Currently set to 5 minutes for testnet. For production this should be 24 hours to match the backend's rate-limiting behaviour. Call `setCooldown(86400)` after deployment.

**`CreditAggregator` global score averaging:** The `_recomputeGlobal()` loop iterates over `supportedChains`. If you add many chains over time, this becomes expensive. For a small set of chains (5–10) it's fine. Worth revisiting if the system scales to many chains.

**`CreditScoreUSC.sol` not shown here** — this contract is tightly coupled to CreditCoin's Merkle precompile at `0xFD3` and their proof verification mechanism. Its interface toward `CreditAggregator` is fixed (`updateChainReport()`), but its internal proof verification logic is CreditCoin-specific.

**ABIs for the frontend** are imported from `out/` after `forge build`. The frontend uses `ICreditAggregator` (an interface ABI) rather than the full `CreditAggregator` ABI since it only needs to call `getGlobalScore()`.
