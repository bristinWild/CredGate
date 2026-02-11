# CredGate Protocol - Interview Notes

**Date:** 2026-02-11
**Interviewer:** Claude (Spec Agent)
**Interviewee:** Subhasish Goswami (Project Lead)
**Source:** spec.pdf + interactive interview

---

## Feature Summary

CredGate (working name from spec: "CredLinea") is a zero-collateral credit protocol built on Creditcoin that combines:
1. **Underwriting Layer** (Borrower-side): Cross-chain wallet reputation + verified RWA ownership proofs
2. **Settlement Layer** (Lender-side): ERC-7540 asynchronous CreditVault for lender capital

The protocol underwrites loans without collateral, using verifiable on-chain signals, and settles lender liquidity asynchronously using Creditcoin USC cross-chain verification.

---

## Technical Decisions

### Target Chain
- **Primary**: Creditcoin Testnet (Chain ID: `102031`, RPC: `https://rpc.cc3-testnet.creditcoin.network`)
- **Cross-chain**: Ethereum Sepolia (for repayment verification via USC)
- Creditcoin is fully EVM-compatible, supports Solidity/Foundry deployment

### Backend
- **Framework**: Express.js (Node.js)
- **Role**: Full Backend API — handles wallet scoring, RWA verification, loan orchestration, and serves frontend data
- **Database**: PostgreSQL with Prisma ORM
- **Scope**: API layer for frontend + blockchain interaction orchestration

### Smart Contracts
- **Tooling**: Foundry (forge, cast, anvil)
- **Contracts**: Full Solidity from scratch
  1. `CreditVault.sol` — ERC-7540 async vault (based on reference impl + customization)
  2. `LoanRegistry.sol` — Loan lifecycle management
  3. `OwnershipProofNFT.sol` — SBT-style RWA proofs
  4. `USCAdapter.sol` — Cross-chain repayment verification via USC precompile (`0x0FD2`)
  5. `MockUSDT.sol` — Mock stablecoin for loan denomination

### Wallet Reputation Scoring
- **Approach**: Real APIs where possible
  - Creditcoin data via Blockscout API (raw loan history, no built-in score)
  - Ethereum cross-chain data via Alchemy/Moralis free tier
- **Scoring**: Custom deterministic formula (no ML) implemented in Node.js
- **Formula from spec**:
  ```
  creditLimit = baseLimit + walletScore * α + rwaConfidence * β - riskPenalty
  ```
  - walletScore (0-100) based on: wallet age, tx frequency, cross-chain activity, DeFi usage, liquidation history, prior repayments

### Frontend Integration
- **Web3**: Wagmi + RainbowKit for wallet connection
- **Existing**: Next.js 16 + React 19 + Tailwind v4 (all main pages built)
- **RWA Minting**: Enhance existing `/rwa` page to actually mint SBT proof NFTs

### Loan Token
- **Mock USDT** (ERC-20) deployed on Creditcoin testnet
- More realistic for credit protocol demo than native tCTC

### USC Cross-Chain Verification
- **Real cross-chain flow**: Repayment happens on Ethereum Sepolia
- Verified via Creditcoin USC precompile at `0x0FD2`
- Uses `INativeQueryVerifier` interface with `MerkleProof` + `ContinuityProof`
- Off-chain worker pattern: Node.js service listens for Sepolia events, generates proofs, submits to USC contract

### Project Structure
- **Monorepo** at root level:
  ```
  /frontend    — Next.js app (existing)
  /backend     — Express.js API
  /contracts   — Foundry project (Solidity)
  ```
- Shared types where applicable

### Testing Strategy
- **Smart contract tests only** (Foundry `forge test`)
- Focus: CreditVault, LoanRegistry, OwnershipProofNFT, USCAdapter
- Manual testing for backend + frontend (tight timeline)

### Demo Flow (All 7 Steps Functional)
1. Borrower wallet evaluated (real API data where possible)
2. Ownership proof minted (SBT NFT via /rwa page)
3. Credit line generated (deterministic formula)
4. Loan registered and funded (from CreditVault)
5. Repayment happens on Sepolia
6. USC verifies repayment cross-chain
7. Vault unlocks LP withdrawals

### Timeline
- **1-2 weeks** (hackathon timeline)
- Must prioritize ruthlessly while keeping all 7 demo steps functional

---

## Requirements

### Functional Requirements
1. Wallet reputation scoring from real chain data (Creditcoin + Ethereum)
2. RWA ownership proof minting (SBT-style, non-transferable)
3. Credit line calculation based on score + RWA proofs
4. Loan registration and lifecycle management on Creditcoin
5. ERC-7540 async vault for lender deposits/redemptions
6. Loan disbursement in mock USDT from vault
7. Cross-chain repayment on Ethereum Sepolia
8. USC verification of repayment on Creditcoin
9. Vault settlement and LP withdrawal unlocking
10. Full frontend integration with wallet connection

### Non-Functional Requirements
- Deploy and demo on Creditcoin testnet
- Sub-second API responses for scoring
- Gas-efficient smart contracts
- Responsive UI (existing design system)
- Clean demo flow for judges

### What NOT to Build (from spec)
- On-chain ML
- Live government API integrations (mock RWA verification OK)
- Legal enforcement claims
- Asset seizure/liquidation logic

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| USC precompile complexity | Use reference examples from `gluwa/usc-testnet-bridge-examples` |
| ERC-7540 novelty | Base on reference implementation, customize |
| Real API rate limits | Fallback to cached/mock data if APIs fail |
| Tight timeline (1-2 weeks) | Parallel workstreams, mock where needed |
| Creditcoin testnet instability | Local Foundry testing as backup |
| Cross-chain proof generation | Follow Creditcoin's documented off-chain worker pattern |

---

## Architecture Decision Records

1. **Monorepo over multi-repo**: Simpler for hackathon, shared types
2. **Express over Next.js API routes**: Separation of concerns, dedicated backend
3. **Foundry over Hardhat**: Faster tests, user preference, official Creditcoin examples use Foundry
4. **PostgreSQL over SQLite**: Production-grade for structured loan data, Prisma provides type safety
5. **Real cross-chain over mock**: Demonstrates Creditcoin's USC — the key differentiator
6. **Mock USDT over tCTC**: More realistic credit protocol representation
7. **Wagmi+RainbowKit over raw ethers**: Best UX for wallet connection, custom chain support
