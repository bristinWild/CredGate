# Creditcoin Blockchain Research for CredGate Protocol

> Research conducted: February 2026
> Scope: Credit history/reputation APIs, USC cross-chain system, testnet/mainnet config, EVM compatibility, SDKs, and off-chain contract patterns for CredGate integration.

---

## Table of Contents

1. [Creditcoin Overview](#1-creditcoin-overview)
2. [On-Chain Credit History & Reputation System](#2-on-chain-credit-history--reputation-system)
3. [Credal API (Creditcoin-as-a-Service)](#3-credal-api-creditcoin-as-a-service)
4. [USC: Universal Smart Contracts (Cross-Chain System)](#4-usc-universal-smart-contracts-cross-chain-system)
5. [Off-Chain Worker & Oracle Architecture](#5-off-chain-worker--oracle-architecture)
6. [Network Configuration (Mainnet & Testnet)](#6-network-configuration-mainnet--testnet)
7. [EVM Compatibility](#7-evm-compatibility)
8. [SDKs, npm Packages & Developer Tools](#8-sdks-npm-packages--developer-tools)
9. [Key Findings for CredGate Integration](#9-key-findings-for-credgate-integration)
10. [Architecture Recommendation for CredGate](#10-architecture-recommendation-for-credgate)

---

## 1. Creditcoin Overview

Creditcoin is a purpose-built L1 blockchain by Gluwa designed as a **reputational credit ledger**. It records loan transactions (origination, funding, repayment) on-chain, creating immutable, verifiable credit histories tied to wallet addresses. It is NOT a general-purpose DeFi chain -- it is specifically designed for real-world asset (RWA) lending and credit identity.

**Key stats:**
- 5M+ loan transactions recorded (primarily via Aella partnership in Africa)
- $80M+ in credit transactions worldwide
- 3M+ credit transaction records on-chain
- Supports cross-chain verification for loans settled on Bitcoin, Ethereum, and ERC-20 networks

**GitHub:** https://github.com/gluwa/creditcoin (Substrate-based, Creditcoin 3.0)
**GitHub (Creditcoin 3.0 EVM):** https://github.com/gluwa/creditcoin3
**Docs:** https://docs.creditcoin.org

---

## 2. On-Chain Credit History & Reputation System

### 2.1 How Creditcoin Records Loans

Creditcoin has a **defined loan lifecycle** recorded as on-chain extrinsics/transactions:

| Stage | Transaction Type | Description |
|-------|-----------------|-------------|
| 1. Negotiation | `Bid` / `Offer` / `Deal` | Both parties agree on loan conditions |
| 2. Funding | `Investment (Transfer)` | Lender sends funds to borrower |
| 3. Repayment | `Repayment` | Borrower repays principal + interest |
| 4. Exemption | `Exemption` | Lender forgives partial debt (optional) |
| 5. Transfer | `Creditor Transfer` | Lender assigns receivable to another party (optional) |

**Data fields captured per loan:**
- Loan principal amount
- Repayment amount (with interest)
- Lender wallet address
- Borrower wallet address
- Partial payment / exemption amounts
- Cross-chain transaction verification references

### 2.2 Credit History Per Wallet

Each completed loan cycle creates **a verifiable trail of credit history per user tied to their wallet address**. This means:

- Every wallet that has participated in Creditcoin loans has an on-chain credit record
- The record is immutable and publicly queryable
- Credit history includes: number of loans, repayment track record, defaults, partial exemptions

### 2.3 Does Creditcoin Have a Built-In Credit Score API?

**No, Creditcoin does NOT compute a credit score natively.** It provides the **raw credit transaction data** (the ledger of loans, repayments, defaults). A credit score / reputation score must be **computed off-chain** by reading this data.

This is actually ideal for CredGate: we can build our own scoring model on top of Creditcoin's raw data.

**How to access the data:**
- **Credal API** (see Section 3) -- the primary interface for reading/writing loan data
- **Subscan Explorer API** -- for querying on-chain extrinsics by wallet address
  - Mainnet: https://creditcoin.subscan.io/
  - Testnet: https://creditcoin3-testnet.subscan.io/
- **Blockscout Explorer API** -- EVM-layer transaction queries
  - Mainnet: https://creditcoin.blockscout.com/
  - Testnet: https://creditcoin-testnet.blockscout.com/
- **Direct RPC queries** via Substrate (`@polkadot/api`) or EVM (`ethers.js`/`viem`)

---

## 3. Credal API (Creditcoin-as-a-Service)

### 3.1 What is Credal?

Credal is **Creditcoin's native API service** -- analogous to what Infura is to Ethereum. It allows third parties to:
- Write credit events (loans, repayments) to the Creditcoin chain
- Query loan data and credit histories
- Operate consumer lending applications at scale

**Website:** https://credal.io
**Contact:** team@creditcoin.org

### 3.2 Key Capabilities

| Feature | Description |
|---------|-------------|
| Loan Registration | `Register Deal Order` -- reduced minimum transactions for loan recording |
| Cross-chain Recording | Execute and record transactions originating on Ethereum/Bitcoin while maintaining unified credit history on Creditcoin |
| Data Querying | Retrieve loan performance data per wallet |
| Privacy-preserving | Transparent auditing with data security |
| On-chain Interoperability | Multi-chain credit consolidation |

### 3.3 Technical Access

Credal API documentation is gated -- it is an enterprise/B2B product. Key points:
- REST API endpoints (specific URLs are not publicly documented)
- Authentication required (enterprise onboarding via Gluwa)
- Used by fintech partners like Aella for production lending
- For open-source/independent access, use direct RPC or Subscan/Blockscout APIs instead

**For CredGate:** We should plan to use **direct on-chain queries** (via RPC or explorer APIs) rather than depending on Credal, unless we establish a partnership with Gluwa. The USC system (next section) gives us a more powerful and permissionless path.

---

## 4. USC: Universal Smart Contracts (Cross-Chain System)

**This is the most important section for CredGate's off-chain contract decision-making.**

### 4.1 What is USC?

USC (Universal Smart Contracts) extends Creditcoin with a **decentralized oracle infrastructure** that enables smart contracts on Creditcoin to **query, verify, and use transaction data from any external blockchain** through cryptographic proofs.

**Key properties:**
- Live on testnet (USC Testnet v2)
- Verification completes within a single block (~15 seconds)
- Batch verification supports up to 10 queries with shared continuity proof
- Fully trustless -- no centralized oracle operator
- Uses Keccak-256 Merkle trees for proof construction

**Docs:** https://docs.creditcoin.org/usc

### 4.2 Architecture: Two-Component System

```
[Source Chain]          [Creditcoin]              [Off-Chain]
(e.g. Ethereum)

  User Tx  ------->  Attestation Layer  <------  Oracle Nodes
  (events)           (block finality)            (attest blocks)
                          |
                          v
                    USC Smart Contract  <------  Proof Generation API
                    (Solidity on EVM)            (off-chain server)
                          |
                          v
                    Business Logic
                    (CredGate scoring)
```

**Components:**
1. **USC Contracts** -- Solidity contracts deployed on Creditcoin EVM that handle proof verification and data extraction
2. **Business Logic Contracts** -- Execute DApp-specific operations based on verified data (can be combined with USC contract)
3. **Native Query Verifier Precompile** (`0x0FD2`) -- Rust-native precompile for synchronous proof verification
4. **Proof Generation API Server** -- Off-chain service that constructs Merkle and continuity proofs
5. **Off-Chain Worker** -- Listens for source chain events and orchestrates the query-prove-verify cycle

### 4.3 The Query-Prove-Verify Cycle

The four phases:

**Phase 1: Query** -- Identify the target transaction on the source chain (e.g., a loan repayment on Ethereum)

**Phase 2: Proof Generation** -- The off-chain Proof Generation API:
  - Queries indexed attestation and checkpoint data on Creditcoin
  - Fetches source chain blocks from RPC nodes
  - Constructs Merkle proofs (transaction inclusion in block)
  - Constructs continuity proofs (block is part of finalized source chain)

**Phase 3: Verification** -- The Native Query Verifier Precompile (`0x0FD2`):
  - Verifies Merkle proof: specific transaction is included in a particular block
  - Verifies continuity proof: the block is linked to attested chain history
  - Executes synchronously within a single transaction (~15 seconds)
  - Uses log2(n) hash operations (20 ops for 1M transactions)

**Phase 4: Data Extraction** -- USC contracts decode verified transaction bytes:
  - Extract transaction type, sender, recipient, value
  - Extract event logs by signature
  - Extract receipt status (success/failure)
  - Execute business logic based on extracted data

### 4.4 Solidity Interfaces & Code

#### Precompile Interface

```solidity
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);
}
```

#### Helper Library

```solidity
library NativeQueryVerifierLib {
    address constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000FD2;

    function getVerifier() internal pure returns (INativeQueryVerifier) {
        return INativeQueryVerifier(PRECOMPILE_ADDRESS);
    }
}
```

#### Transaction Data Decoder

```solidity
import {EvmV1Decoder} from "./EvmV1Decoder.sol";

// Extract transaction type
uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);

// Decode receipt fields
EvmV1Decoder.ReceiptFields memory receipt =
    EvmV1Decoder.decodeReceiptFields(encodedTransaction);

// Extract specific event logs by signature
EvmV1Decoder.LogEntry[] memory logs =
    EvmV1Decoder.getLogsByEventSignature(receipt, eventSignature);

// Get common transaction fields (from, to, value, etc.)
EvmV1Decoder.CommonTxFields memory txFields =
    EvmV1Decoder.decodeCommonTxFields(encodedTransaction);
```

#### Main USC Entry Point Pattern

```solidity
function mintFromQuery(
    uint64 chainKey,
    uint64 blockHeight,
    bytes calldata encodedTransaction,
    bytes32 merkleRoot,
    INativeQueryVerifier.MerkleProofEntry[] calldata siblings,
    bytes32 lowerEndpointDigest,
    bytes32[] calldata continuityRoots
) external returns (bool success) {
    // 1. Calculate transaction index for replay protection
    uint256 txIndex = _calculateTransactionIndex(siblings);

    // 2. Build unique key and check for replay
    bytes32 txKey = keccak256(abi.encodePacked(chainKey, blockHeight, txIndex));
    require(!processedQueries[txKey], "Already processed");
    processedQueries[txKey] = true;

    // 3. Verify proofs via precompile (synchronous)
    INativeQueryVerifier verifier = NativeQueryVerifierLib.getVerifier();
    bool verified = verifier.verifyAndEmit(
        chainKey, blockHeight, encodedTransaction,
        INativeQueryVerifier.MerkleProof(merkleRoot, siblings),
        INativeQueryVerifier.ContinuityProof(lowerEndpointDigest, continuityRoots)
    );
    require(verified, "Proof verification failed");

    // 4. Extract and validate transaction data
    _validateTransactionContents(encodedTransaction);

    // 5. Execute business logic (e.g., update credit score, mint tokens)
    // ... CredGate logic here ...

    return true;
}
```

#### Transaction Index Calculator (Replay Protection)

```solidity
function _calculateTransactionIndex(
    INativeQueryVerifier.MerkleProofEntry[] memory proof
) internal pure returns (uint256 index) {
    index = 0;
    for (uint256 i = 0; i < proof.length; i++) {
        if (proof[i].isLeft) {
            index |= 1 << i;
        }
    }
    return index;
}
```

### 4.5 Important Limitations

1. **Proof verification only confirms transaction inclusion** -- it does NOT validate whether the transaction was successful. Success status must be checked in the smart contract via receipt decoding.
2. **USC is currently on testnet** -- not yet live on Creditcoin mainnet.
3. **Proof generation requires an off-chain server** -- the Proof Generation API is a separate infrastructure component.

### 4.6 Reference Implementations

All contract source code is available at:
- **Repository:** https://github.com/gluwa/usc-testnet-bridge-examples
- **Key Solidity files in `contracts/sol/`:**

| File | Purpose |
|------|---------|
| `SimpleMinterUSC.sol` | Complete USC + ERC20 minting example |
| `EvmV1Decoder.sol` | Library for decoding cross-chain transaction data |
| `VerifierInterface.sol` | INativeQueryVerifier interface definition |
| `USCLoanManager.sol` | Cross-chain loan state management |
| `AuxiliaryLoanContract.sol` | Source chain loan helper (emits events) |
| `LoanTypes.sol` | Loan data type definitions |
| `TestERC20.sol` | Test token for examples |

---

## 5. Off-Chain Worker & Oracle Architecture

### 5.1 Design Pattern for Off-Chain Decision Making

This is directly relevant to CredGate's requirement for **off-chain contract decisions**.

The Creditcoin USC architecture provides a clean separation:

```
Source Chain (e.g., Ethereum/Solana)
  |
  |-- User performs action (loan repayment, token transfer, etc.)
  |-- Source chain contract emits event
  |
  v
Off-Chain Worker (TypeScript/Node.js)
  |
  |-- Listens for source chain events
  |-- Waits for block attestation on Creditcoin
  |-- Calls Proof Generation API to create proofs
  |-- Submits proofs to USC contract on Creditcoin
  |
  v
USC Contract on Creditcoin (Solidity)
  |
  |-- Verifies proofs via precompile (0x0FD2)
  |-- Extracts transaction data
  |-- Executes business logic (e.g., credit scoring decision)
  |-- Updates on-chain state
```

### 5.2 Off-Chain Worker Implementation

The off-chain worker is a TypeScript/Node.js process that:

1. **Monitors source chain events** from a specific contract address
2. **Waits for attestation** -- the block containing the event must be attested on Creditcoin
3. **Generates proofs** via the Proof Generation API server
4. **Submits to Creditcoin** -- calls the USC contract with proofs + encoded transaction

**Example scripts (from the loan-flow tutorial):**
```
yarn loan_flow:start_worker      -- Launch off-chain worker
yarn loan_flow:register_loan     -- Register a cross-chain loan
yarn loan_flow:fund_loan         -- Fund with cross-chain verification
yarn loan_flow:repay_loan        -- Repay with cross-chain verification
yarn loan_flow:inspect_loan      -- Query loan state
```

### 5.3 DApp Design Pattern Best Practices

From Creditcoin's official docs:

1. **Minimal source chain logic** -- Source chain contracts should ONLY emit events with necessary data
2. **All business logic on Creditcoin** -- Scoring, decisions, state management happen on Creditcoin
3. **Single source contract per DApp** -- One contract emits all events so the off-chain worker only watches one address
4. **Unique events per query type** -- Use specific events (e.g., `LoanFunded`, `LoanRepaid`) rather than generic `Transfer`
5. **Complete data in events** -- Include all relevant information (who, what, how much) in the emitted events

---

## 6. Network Configuration (Mainnet & Testnet)

### 6.1 Creditcoin Mainnet (EVM)

| Parameter | Value |
|-----------|-------|
| **Chain ID** | `102030` (hex: `0x18e8e`) |
| **RPC URL (HTTPS)** | `https://mainnet3.creditcoin.network` |
| **RPC URL (WSS)** | `wss://mainnet3.creditcoin.network` |
| **Native Currency** | CTC (18 decimals) |
| **EVM Explorer (Blockscout)** | https://creditcoin.blockscout.com/ |
| **Substrate Explorer (Subscan)** | https://creditcoin.subscan.io/ |
| **Staking Dashboard** | https://staking.creditcoin.org/ |
| **Telemetry** | https://telemetry.creditcoin.network/ |
| **EIP Support** | EIP-155, EIP-1559 |
| **Docker Image** | `gluwa/creditcoin3:3.61.0-mainnet` |
| **Min @polkadot/api** | v16.1.1 |

### 6.2 Creditcoin Testnet (EVM)

| Parameter | Value |
|-----------|-------|
| **Chain ID** | `102031` (hex: `0x18e8f`) |
| **RPC URL (HTTPS)** | `https://rpc.cc3-testnet.creditcoin.network` |
| **RPC URL (WSS)** | `wss://rpc.cc3-testnet.creditcoin.network` |
| **Native Currency** | tCTC (18 decimals) |
| **EVM Explorer (Blockscout)** | https://creditcoin-testnet.blockscout.com/ |
| **Substrate Explorer (Subscan)** | https://creditcoin3-testnet.subscan.io/ |
| **Faucet** | Discord `#creditcoin-faucet` channel: `/faucet address: 0xYOUR_ADDRESS` (100 tCTC/24hr) |
| **EIP Support** | EIP-155, EIP-1559 |
| **Docker Image** | `gluwa/creditcoin3:3.61.0-testnet` |

### 6.3 MetaMask / Wallet Configuration

```json
{
  "mainnet": {
    "chainId": "0x18e8e",
    "chainName": "Creditcoin",
    "nativeCurrency": { "name": "CTC", "symbol": "CTC", "decimals": 18 },
    "rpcUrls": ["https://mainnet3.creditcoin.network"],
    "blockExplorerUrls": ["https://creditcoin.blockscout.com"]
  },
  "testnet": {
    "chainId": "0x18e8f",
    "chainName": "Creditcoin Testnet",
    "nativeCurrency": { "name": "Testnet CTC", "symbol": "tCTC", "decimals": 18 },
    "rpcUrls": ["https://rpc.cc3-testnet.creditcoin.network"],
    "blockExplorerUrls": ["https://creditcoin-testnet.blockscout.com"]
  }
}
```

---

## 7. EVM Compatibility

Creditcoin 3.0 is **fully EVM-compatible**. Key details:

### 7.1 What Works

- Deploy Solidity / Vyper contracts using standard tools (Hardhat, Foundry, Remix)
- Use ethers.js, viem, web3.js for interaction
- MetaMask and all EVM wallets work natively
- Blockscout provides EVM-compatible block explorer
- EIP-1559 dynamic fee transactions supported
- Standard EVM opcodes and precompiles available
- Additionally: Creditcoin-specific precompile at `0x0FD2` (Native Query Verifier)

### 7.2 Key Differences from Ethereum

| Aspect | Creditcoin | Ethereum |
|--------|-----------|----------|
| Consensus | Nominated Proof-of-Stake (NPoS) via Substrate | Proof-of-Stake |
| Gas Calculation | Substrate "weight" system (maps to equivalent gas fees) | Resource-based gas |
| Block Time | ~15 seconds | ~12 seconds |
| Dual Layer | Both Substrate + EVM layers coexist | EVM only |
| Staking | Only via Substrate accounts (not EVM accounts) | Native EVM staking |

### 7.3 Deployment with Foundry (Recommended for USC)

The USC examples use Foundry. Configuration from `foundry.toml`:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup --version v1.2.3

# Deploy to Creditcoin Testnet
forge create --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  --private-key $PRIVATE_KEY \
  src/MyContract.sol:MyContract

# Interact with contracts
cast send --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  $CONTRACT_ADDRESS "functionName(uint256)" 123 \
  --private-key $PRIVATE_KEY

# Read contract state
cast call --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  $CONTRACT_ADDRESS "viewFunction()(uint256)"
```

---

## 8. SDKs, npm Packages & Developer Tools

### 8.1 Official npm Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `@gluwa/creditcoin-public-prover` | Prover.sol smart contract for serving as public prover in USC system | `npm i @gluwa/creditcoin-public-prover` |
| `@gluwa/creditcoin-dex-router-sdk` | Smart order router adapted for Creditcoin DEX ecosystem | `npm i @gluwa/creditcoin-dex-router-sdk` |
| `@polkadot/api` (v16.1.1+) | Substrate RPC interaction (for non-EVM layer) | `npm i @polkadot/api` |

### 8.2 GitHub Repositories

| Repository | Description |
|-----------|-------------|
| [gluwa/creditcoin](https://github.com/gluwa/creditcoin) | Official Creditcoin protocol implementation (Substrate) |
| [gluwa/creditcoin3](https://github.com/gluwa/creditcoin3) | Creditcoin 3.0 node with Ethereum RPC support |
| [gluwa/usc-testnet-bridge-examples](https://github.com/gluwa/usc-testnet-bridge-examples) | USC tutorials, bridge examples, loan flow demos |
| [gluwa/ccnext-testnet-bridge-examples](https://github.com/gluwa/ccnext-testnet-bridge-examples) | Older CCNext bridge examples |

### 8.3 Standard EVM Tooling (All Compatible)

Since Creditcoin is EVM-compatible, all standard Ethereum tools work:

```bash
# Foundry (recommended for USC)
npm i -D @foundry-rs/hardhat-anvil

# Hardhat
npm i -D hardhat @nomicfoundation/hardhat-toolbox

# ethers.js / viem for frontend
npm i ethers viem wagmi @rainbow-me/rainbowkit

# OpenZeppelin contracts
npm i @openzeppelin/contracts
```

### 8.4 Pre-Deployed Contracts (Testnet)

From the hello-bridge tutorial:
- **Test ERC20 (Sepolia):** `0x15166Ba9d24aBfa477C0c88dD1E6321297214eC8`
- USC Minter and other contracts are referenced in the `.env` file of the examples repo

---

## 9. Key Findings for CredGate Integration

### 9.1 What Creditcoin Provides That CredGate Needs

| Need | Creditcoin Solution | Status |
|------|-------------------|--------|
| Wallet credit history data | On-chain loan records (5M+ transactions) | Available on mainnet |
| Cross-chain transaction verification | USC + Native Query Verifier precompile | Testnet only |
| Off-chain contract decision-making | Off-chain worker + USC pattern | Testnet only |
| EVM contract deployment | Full EVM compatibility | Mainnet ready |
| Credit score computation | NOT built-in (raw data only) | Must build ourselves |
| Permissionless data access | Subscan/Blockscout APIs + direct RPC | Available |
| Enterprise API (Credal) | Gated, requires partnership | Enterprise only |

### 9.2 What Creditcoin Does NOT Provide

1. **No credit score API** -- Creditcoin stores raw loan data, not computed scores
2. **No wallet reputation score** -- Must be computed from on-chain transaction history
3. **No public REST API for credit queries** -- Credal is enterprise-gated; use explorer APIs or direct RPC
4. **USC is not on mainnet yet** -- Cross-chain verification is testnet-only
5. **Proof Generation API server details are not fully public** -- May need to run your own or use their testnet instance

### 9.3 Alternative/Complementary Data Sources

For broader wallet reputation beyond Creditcoin's loan data:

| Service | What It Provides |
|---------|-----------------|
| **Cred Protocol** (credprotocol.com) | On-chain credit risk scoring, wallet liquidation/default probability, free sandbox API |
| **ChainAware.ai** | Crypto credit score lookup per wallet |
| **LedgerScore** | Cryptocurrency credit scoring |
| **Subscan API** | Direct on-chain data queries for Substrate chains |
| **Blockscout API** | EVM-layer transaction/contract queries |

---

## 10. Architecture Recommendation for CredGate

Based on this research, here is the recommended architecture for CredGate's off-chain contract decision-making:

### 10.1 Proposed Flow

```
[User Wallet] --(connects)--> [CredGate Frontend (Next.js)]
       |
       v
[CredGate Off-Chain Service (Node.js/TypeScript)]
       |
       |-- Query Creditcoin for wallet's loan history
       |   (via Subscan API / Blockscout API / direct RPC)
       |
       |-- Query other chains for wallet activity
       |   (via USC cross-chain verification when mainnet-ready)
       |
       |-- Compute credit/reputation score (off-chain)
       |
       |-- Submit score + proofs to CredGate USC Contract on Creditcoin
       |
       v
[CredGate Smart Contract on Creditcoin (Solidity)]
       |
       |-- Verify cross-chain proofs via precompile (0x0FD2)
       |-- Store verified credit score on-chain
       |-- Gate access/features based on score
       |-- Emit events for frontend consumption
```

### 10.2 Immediate Steps (Can Start Now)

1. **Deploy to Creditcoin Testnet** using Foundry with RPC `https://rpc.cc3-testnet.creditcoin.network` (Chain ID: 102031)
2. **Clone USC examples** from `gluwa/usc-testnet-bridge-examples` and study the loan-flow tutorial
3. **Build a credit scoring contract** that uses the `INativeQueryVerifier` interface to verify cross-chain loan data
4. **Use Blockscout API** on testnet to query existing wallet credit histories
5. **Implement off-chain worker** in TypeScript following the DApp design patterns

### 10.3 Key Technical Decisions

| Decision | Recommendation | Reason |
|----------|---------------|--------|
| Chain for main contract | Creditcoin Testnet (now), Mainnet (later) | Native precompile for cross-chain verification |
| Scoring computation | Off-chain (Node.js service) | Complex scoring logic doesn't belong on-chain |
| Score storage | On-chain (Creditcoin EVM) | Verifiable, immutable, queryable by other contracts |
| Cross-chain data | USC when available, Blockscout API for now | USC is testnet-only; Blockscout works today |
| Contract framework | Foundry (Forge + Cast) | USC examples all use Foundry; best ecosystem fit |
| Frontend integration | ethers.js or viem | Standard EVM -- works with Creditcoin's EVM RPC |

---

## Sources

- [Creditcoin Official Site](https://creditcoin.org/)
- [Creditcoin Documentation](https://docs.creditcoin.org)
- [USC Product Overview](https://docs.creditcoin.org/usc)
- [USC Query, Proof and Verification](https://docs.creditcoin.org/usc/creditcoin-oracle-subsystems/query-proof-and-verification)
- [Merkle Proving Transaction Inclusion](https://docs.creditcoin.org/usc/creditcoin-oracle-subsystems/query-proof-and-verification/merkle-proving-transaction-inclusion)
- [Universal Smart Contracts Docs](https://docs.creditcoin.org/usc/dapp-builder-infrastructure/universal-smart-contracts)
- [DApp Design Patterns](https://docs.creditcoin.org/usc/dapp-builder-infrastructure/dapp-design-patterns)
- [USC Tutorials](https://docs.creditcoin.org/usc/dapp-builder-infrastructure/usc-tutorials)
- [Creditcoin EVM Compatibility](https://docs.creditcoin.org/evm-compatibility)
- [Creditcoin Testnet Config](https://docs.creditcoin.org/environments/testnet)
- [Creditcoin Mainnet Config](https://docs.creditcoin.org/environments/mainnet)
- [Creditcoin Enterprise FAQ](https://docs.creditcoin.org/cc-enterprise/faq)
- [Credal 101 Blog](https://creditcoin.org/blog/credal-101-creditcoins-api-explained/)
- [Designing Creditcoin Blog](https://creditcoin.org/blog/designing-creditcoin/)
- [USC Blog Announcement](https://creditcoin.org/blog/universal-smart-contracts/)
- [ChainList - Mainnet](https://chainlist.org/chain/102030)
- [ChainList - Testnet](https://chainlist.org/chain/102031)
- [Thirdweb - Creditcoin Testnet](https://thirdweb.com/creditcoin-testnet)
- [GitHub: gluwa/creditcoin](https://github.com/gluwa/creditcoin)
- [GitHub: gluwa/creditcoin3](https://github.com/gluwa/creditcoin3)
- [GitHub: gluwa/usc-testnet-bridge-examples](https://github.com/gluwa/usc-testnet-bridge-examples)
- [npm: @gluwa/creditcoin-public-prover](https://www.npmjs.com/package/@gluwa/creditcoin-public-prover)
- [npm: @gluwa/creditcoin-dex-router-sdk](https://www.npmjs.com/package/@gluwa/creditcoin-dex-router-sdk)
- [Creditcoin Subscan Explorer](https://creditcoin.subscan.io/)
- [Creditcoin Blockscout Explorer](https://creditcoin.blockscout.com/)
- [HackerNoon: Trust Engines](https://hackernoon.com/trust-engines-how-creditcoin-makes-invisible-credit-histories-verifiable)
- [Cred Protocol](https://credprotocol.com/)
