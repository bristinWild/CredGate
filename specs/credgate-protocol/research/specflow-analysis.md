# SpecFlow Analysis - CredGate Protocol

## Critical Path Analysis

### End-to-End Demo Flow (7 Steps)
```
[1] Wallet Scoring → [2] RWA Proof Minting → [3] Credit Line Generation →
[4] Loan Registration + Funding → [5] Repayment on Sepolia →
[6] USC Cross-Chain Verification → [7] Vault Settlement + LP Withdrawal
```

### Dependency Graph
```
MockUSDT.sol ─────────────────────────────┐
                                          ├──→ CreditVault.sol
OwnershipProofNFT.sol ───┐                │
                         ├──→ LoanRegistry.sol
Backend Scoring API ─────┘                │
                                          │
USCAdapter.sol ───────────────────────────┘
```

### Phase Dependencies
- CreditVault depends on MockUSDT (for asset token)
- LoanRegistry depends on CreditVault + OwnershipProofNFT + MockUSDT
- USCAdapter depends on LoanRegistry (to mark loans as verified)
- Backend depends on contract ABIs (generated after deployment)
- Frontend depends on Backend API + contract ABIs + Wagmi config

## Edge Cases Identified

### Scoring
- Wallet with zero history → minimum base score (not zero credit)
- Wallet on Creditcoin but not Ethereum → partial score, cross-chain factor = 0
- API rate limit hit → serve cached score if available, else error
- Score computation timeout → return error, do not grant credit on stale data

### RWA Proofs
- Same document submitted twice → reject duplicate `documentHash`
- Proof minting fails mid-transaction → pending status in DB, retry mechanism
- Multiple proofs for same wallet → aggregate `rwaConfidence` (cap at 100)

### Lending
- Loan request exceeds vault liquidity → reject with "insufficient vault liquidity"
- Multiple concurrent loan requests from same borrower → only one active loan per borrower (MVP)
- Borrower repays wrong amount → USC verification fails, loan stays active
- Borrower repays to wrong address → verification fails

### Vault
- Deposit request when vault is at capacity → queue or reject
- Redemption request when all capital is deployed → queue, unlock on repayment
- Multiple lenders redeeming simultaneously → pro-rata distribution
- Vault experiences default → loss socialization across share holders

### Cross-Chain (USC)
- Sepolia tx confirmed but Creditcoin attestation delayed → retry with backoff
- Proof generation API unavailable → queue and retry
- Invalid proof submitted → revert on-chain, log error, retry proof generation
- Block reorganization on Sepolia → wait for sufficient confirmations (12+ blocks)

## Gap Analysis

### Technical Gaps
1. **No authentication system** → Need wallet signature verification middleware
2. **No state management** → Frontend needs React Query (comes with Wagmi) + context for app state
3. **No environment configuration** → Need `.env` files for all three workspaces
4. **No shared types** → Contract ABIs need to be exportable to both backend and frontend
5. **No monitoring** → At minimum, log all blockchain transactions for demo debugging

### Acceptance Criteria Gaps (from spec)
1. Spec says "credit flywheel" (repayment improves score) → Need to update score after verified repayment
2. Spec says "dynamic interest rate" → Need interest rate calculation based on risk tier
3. Spec says "loss socialization" on default → Need vault accounting for defaults
4. Spec mentions "protocol operator" role → Need admin/operator access control

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| USC precompile behaves differently than docs | Medium | High | Test on Creditcoin testnet early, have mock fallback |
| ERC-7540 reference has bugs | Low | High | Test thoroughly, start from simple vault then add async |
| Creditcoin testnet downtime | Medium | Medium | Local Foundry testing, switch to Sepolia-only demo |
| Real API data incomplete/empty for test wallets | High | Medium | Hybrid: real APIs with mock fallback data |
| Timeline overflow (>2 weeks) | High | Medium | Prioritize contracts + backend first, polish frontend last |

## Recommended Build Order

### Week 1: Foundation (Days 1-7)
| Day | Task | Output |
|-----|------|--------|
| 1 | Foundry setup + MockUSDT + OwnershipProofNFT | Deployable SBT + test token |
| 2 | CreditVault (ERC-7540 async vault) | Deposit/redeem working locally |
| 3 | LoanRegistry + wire to vault | Full loan lifecycle locally |
| 4 | Backend setup: Express + Prisma + scoring API | API returning mock scores |
| 5 | Backend: Loan + vault + RWA endpoints | Full API surface |
| 6 | Frontend: Wagmi/RainbowKit + wallet connection | Working wallet connection |
| 7 | Frontend: Connect all pages to backend API | Dynamic data flowing |

### Week 2: Integration + Polish (Days 8-14)
| Day | Task | Output |
|-----|------|--------|
| 8 | USCAdapter + off-chain worker service | Cross-chain verification |
| 9 | Deploy all contracts to Creditcoin testnet | Live testnet deployment |
| 10 | Real API integration (Blockscout + Alchemy) | Real wallet data scoring |
| 11 | End-to-end testing on testnet | Full 7-step demo working |
| 12 | Foundry tests (unit + fuzz) | Test coverage |
| 13 | UI polish + error handling | Production-quality UX |
| 14 | Demo rehearsal + documentation | Ready for presentation |
