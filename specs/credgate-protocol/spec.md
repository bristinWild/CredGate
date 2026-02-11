# CredGate Protocol Spec

## Metadata
- Project: CredGate
- Milestone: Hackathon MVP
- Linear Issue: N/A
- Interview Date: 2026-02-11
- Status: [ ] Draft / [x] Ready for Review / [ ] Approved

## Summary

CredGate is a zero-collateral credit protocol built on Creditcoin that underwrites loans using cross-chain wallet reputation and verified real-world asset ownership proofs, and settles lender liquidity asynchronously using an ERC-7540 CreditVault with Creditcoin USC cross-chain verification.

The protocol has two layers: an **Underwriting Layer** that scores borrower wallets using on-chain data from Creditcoin and Ethereum plus non-custodial RWA ownership proofs (SBT NFTs), and a **Settlement Layer** where an ERC-7540 async vault pools lender capital, funds approved loans, and only unlocks withdrawals after USC-verified cross-chain repayment.

## Requirements

### Functional
1. Wallet reputation scoring from real blockchain data (Creditcoin + Ethereum) with deterministic formula
2. RWA ownership proof minting as non-transferable SBT NFTs (land records, vehicle ownership)
3. Credit line calculation based on wallet score + RWA confidence
4. Loan registration and lifecycle management (Pending -> Active -> Repaid/Defaulted)
5. ERC-7540 async CreditVault for lender deposits and redemptions
6. Loan disbursement in mock USDT from vault to borrower
7. Cross-chain repayment on Ethereum Sepolia
8. USC precompile (0x0FD2) verification of repayment on Creditcoin testnet
9. Vault settlement: unlock LP withdrawals after verified repayment
10. Full frontend integration with RainbowKit wallet connection

### Non-Functional
- Deploy on Creditcoin Testnet (Chain ID: 102031)
- Sub-2-second API responses for scoring
- Smart contract test coverage via Foundry
- All 7 demo steps functional end-to-end

## Technical Design

### Architecture

```
Frontend (Next.js 16 + Wagmi + RainbowKit)
    │
    ├── REST API ──→ Backend (Express.js + PostgreSQL/Prisma)
    │                    ├── Scoring Service (real APIs + formula)
    │                    ├── Loan Orchestrator
    │                    ├── USC Off-chain Worker
    │                    └── Blockscout/Alchemy clients
    │
    └── Web3 ──→ Smart Contracts (Creditcoin Testnet)
                     ├── CreditVault.sol (ERC-7540)
                     ├── LoanRegistry.sol
                     ├── OwnershipProofNFT.sol (SBT)
                     ├── USCAdapter.sol (0x0FD2 precompile)
                     └── MockUSDT.sol
```

### Data Model

**Core entities:**
- `Wallet` - user wallet address (primary key)
- `WalletScore` - computed credit score with metrics breakdown
- `RWAProof` - RWA ownership proof metadata + SBT token reference
- `Loan` - loan lifecycle with on-chain tx references
- `VaultDeposit` - LP deposit/claim tracking

**On-chain:**
- 5 Solidity contracts deployed via Foundry to Creditcoin testnet
- Mock USDT (ERC-20, 6 decimals) as loan denomination
- SBT proofs (ERC-721 with transfer disabled)

### API Changes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/scoring/compute` | Compute wallet score from chain data |
| GET | `/api/scoring/:address` | Get cached score |
| POST | `/api/rwa/mint` | Mint SBT proof NFT |
| POST | `/api/loans/request` | Request new loan |
| POST | `/api/loans/:id/fund` | Fund approved loan |
| POST | `/api/loans/:id/repay` | Record repayment |
| POST | `/api/vault/deposit` | Record deposit request |
| GET | `/api/vault/stats` | Vault TVL and metrics |

## Implementation Plan

### Phase 1: Smart Contracts (Days 1-3)
- [ ] Foundry project setup with foundry.toml for Creditcoin testnet
- [ ] MockUSDT.sol (ERC-20 mock stablecoin, 6 decimals)
- [ ] OwnershipProofNFT.sol (SBT with transfer blocking)
- [ ] CreditVault.sol (ERC-7540 async deposit/redeem with loan capital management)
- [ ] LoanRegistry.sol (loan lifecycle: register, fund, repay, default)
- [ ] USCAdapter.sol (cross-chain verification via 0x0FD2 precompile)
- [ ] Deploy.s.sol deployment script

### Phase 2: Backend API (Days 4-6)
- [ ] Express.js project with TypeScript + Prisma + PostgreSQL
- [ ] Prisma schema (Wallet, WalletScore, RWAProof, Loan, VaultDeposit)
- [ ] Scoring service with deterministic formula + Blockscout/Alchemy data
- [ ] Loan orchestration service (request, fund, repay flow)
- [ ] RWA proof submission and minting endpoints
- [ ] Vault deposit/redeem tracking endpoints
- [ ] Viem clients for Creditcoin + Sepolia contract interaction

### Phase 3: Frontend Integration (Days 6-8)
- [ ] Install wagmi + viem + RainbowKit + @tanstack/react-query
- [ ] Creditcoin testnet chain definition + wagmi config
- [ ] Provider wrapper (WagmiProvider + RainbowKit + QueryClient)
- [ ] Replace static "Connect Wallet" with RainbowKit ConnectButton
- [ ] Connect CreditScoreRing to scoring API (dynamic score)
- [ ] Connect Supply page to vault contract (requestDeposit/claimDeposit)
- [ ] Connect Borrow page to loan API (request loan, view status)
- [ ] Connect RWA page to SBT minting flow

### Phase 4: Cross-Chain Integration (Days 8-10)
- [ ] Deploy RepaymentReceiver.sol on Ethereum Sepolia
- [ ] USC off-chain worker service (listen Sepolia -> generate proofs -> verify on Creditcoin)
- [ ] End-to-end repayment verification flow
- [ ] Vault settlement after verified repayment

### Phase 5: Testing & Deployment (Days 10-12)
- [ ] Foundry unit tests for all 5 contracts
- [ ] Foundry fuzz tests for CreditVault and scoring
- [ ] Deploy all contracts to Creditcoin testnet
- [ ] End-to-end testnet integration testing

### Phase 6: Polish & Demo (Days 12-14)
- [ ] Error handling and loading states
- [ ] Demo data seeding
- [ ] End-to-end demo rehearsal
- [ ] Documentation

## Test Plan
- [ ] Unit tests for: CreditVault, LoanRegistry, OwnershipProofNFT, USCAdapter (Foundry)
- [ ] Fuzz tests for: deposit/redeem amounts, credit limit calculations (Foundry)
- [ ] Integration tests for: full loan lifecycle on local Foundry fork
- [ ] E2E tests for: 7-step demo flow on Creditcoin testnet

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| USC precompile complexity | Medium | High | Use gluwa/usc-testnet-bridge-examples as reference; mock fallback |
| ERC-7540 impl bugs | Medium | High | Base on ERC4626-Alliance reference; extensive unit tests |
| Creditcoin testnet instability | Low | High | Local Foundry testing; Sepolia-only backup plan |
| Real API rate limits | Medium | Medium | Cache scores for 1 hour; mock data fallback |
| Timeline overflow (>2 weeks) | Medium | High | Parallel workstreams; prioritize contracts > backend > frontend |
| Cross-chain proof generation failure | Medium | Medium | Exponential backoff retry; queue failed proofs |

## Open Questions (Resolved)
| Question | Answer | Decided By |
|----------|--------|------------|
| Target chain? | Creditcoin Testnet (102031) | Subhasish |
| Backend framework? | Express.js (Node.js) | Subhasish |
| Database? | PostgreSQL + Prisma | Subhasish |
| SC tooling? | Foundry (forge/cast) | Subhasish |
| Web3 frontend? | Wagmi + RainbowKit | Subhasish |
| Loan token? | Mock USDT (ERC-20) | Subhasish |
| USC flow? | Real cross-chain (Sepolia -> Creditcoin) | Subhasish |
| Scoring data? | Real APIs where possible + mock fallback | Subhasish |
| ERC-7540 approach? | Reference impl + customize | Subhasish |
| Project structure? | Monorepo (/frontend, /backend, /contracts) | Subhasish |

## Interview Notes
See: [interview-notes.md](./interview-notes.md)

## Technical Details
See: [technical-spec.md](./technical-spec.md)

## Research
See: [research/](./research/)

---

## Approval
- [ ] Pod Leader Approved
- Approved date: ___

## Next Steps
After approval, run: `/superform:work specs/credgate-protocol/technical-spec.md`
