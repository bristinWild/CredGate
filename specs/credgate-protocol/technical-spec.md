# CredGate Protocol - Technical Specification

## Overview

CredGate is a zero-collateral credit protocol built on Creditcoin that combines cross-chain wallet reputation scoring with verified real-world asset (RWA) ownership proofs to underwrite loans, and settles lender liquidity asynchronously through an ERC-7540 CreditVault verified by Creditcoin's USC (Universal Smart Contracts) cross-chain verification system.

## Problem Statement

Traditional DeFi lending requires over-collateralization with volatile on-chain assets, price oracles, and liquidation mechanisms. Real-world credit works differently: borrowers are assessed on history, reputation, and asset ownership, with repayments occurring asynchronously and often cross-chain. There is no trust-minimized on-chain primitive that underwrites zero-collateral credit using verifiable signals and settles lender liquidity only after real repayment is proven.

## Proposed Solution

A two-layer architecture:

1. **Underwriting Layer** (Borrower-side): Deterministic credit scoring using cross-chain wallet reputation (Creditcoin + Ethereum) and non-custodial RWA ownership proofs (SBT-style NFTs)
2. **Settlement Layer** (Lender-side): ERC-7540 asynchronous CreditVault that pools lender capital, funds approved loans, and unlocks withdrawals only after Creditcoin USC-verified repayment

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)              │
│  Wagmi + RainbowKit │ Creditcoin Testnet + Sepolia   │
└──────────────┬──────────────────────┬────────────────┘
               │ REST API             │ Direct Web3
               ▼                      ▼
┌──────────────────────┐   ┌─────────────────────────┐
│   BACKEND (Express)  │   │  SMART CONTRACTS         │
│   PostgreSQL+Prisma  │   │  (Creditcoin Testnet)    │
│                      │   │                          │
│  - Scoring Engine    │   │  - CreditVault.sol       │
│  - Loan Orchestrator │   │  - LoanRegistry.sol      │
│  - USC Worker        │   │  - OwnershipProofNFT.sol │
│  - RWA Verifier      │   │  - USCAdapter.sol        │
│  - Blockscout Client │   │  - MockUSDT.sol          │
└──────────┬───────────┘   └─────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│              EXTERNAL DATA SOURCES                   │
│  Blockscout API │ Alchemy/Moralis │ USC Prover API  │
└─────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Smart Contracts Foundation (Days 1-3)

**1.1 Project Setup**
```
contracts/
  src/
    CreditVault.sol
    LoanRegistry.sol
    OwnershipProofNFT.sol
    USCAdapter.sol
    MockUSDT.sol
    interfaces/
      IERC7540.sol
      INativeQueryVerifier.sol
    libraries/
      CreditScoring.sol
  test/
    unit/
      CreditVault.t.sol
      LoanRegistry.t.sol
      OwnershipProofNFT.t.sol
    fuzz/
      CreditVault.fuzz.t.sol
    helpers/
      BaseTest.sol
      MockVerifier.sol
  script/
    Deploy.s.sol
  foundry.toml
```

**1.2 MockUSDT.sol** (ERC-20 Mock Stablecoin)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**1.3 OwnershipProofNFT.sol** (SBT-style RWA Proofs)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OwnershipProofNFT is ERC721, Ownable {
    struct OwnershipProof {
        address owner;
        bytes32 documentHash;
        string source;        // "Bhunaksha", "RTO", etc.
        uint256 verifiedAt;
        string metadataURI;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => OwnershipProof) public proofs;
    mapping(address => uint256[]) public ownerProofs;

    event ProofMinted(uint256 indexed tokenId, address indexed owner, bytes32 documentHash, string source);

    constructor() ERC721("CredGate Ownership Proof", "CGPROOF") Ownable(msg.sender) {}

    function mintProof(
        address to,
        bytes32 documentHash,
        string calldata source,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        proofs[tokenId] = OwnershipProof({
            owner: to,
            documentHash: documentHash,
            source: source,
            verifiedAt: block.timestamp,
            metadataURI: metadataURI
        });
        ownerProofs[to].push(tokenId);
        emit ProofMinted(tokenId, to, documentHash, source);
        return tokenId;
    }

    function getOwnerProofCount(address owner) external view returns (uint256) {
        return ownerProofs[owner].length;
    }

    // Soulbound: block all transfers
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert("Soulbound: transfer blocked");
        return super._update(to, tokenId, auth);
    }
}
```

**1.4 CreditVault.sol** (ERC-7540 Async Vault)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CreditVault is ERC4626, ReentrancyGuard, Ownable {
    // Pending deposit requests
    mapping(address => uint256) public pendingDeposits;
    // Claimable deposits (after fulfillment)
    mapping(address => uint256) public claimableDeposits;
    // Pending redemption requests
    mapping(address => uint256) public pendingRedeems;
    // Claimable redemptions
    mapping(address => uint256) public claimableRedeems;

    address public loanRegistry;
    bool public emergencyPaused;
    uint256 public totalDeployed; // capital deployed to loans

    event DepositRequested(address indexed controller, uint256 assets);
    event DepositFulfilled(address indexed controller, uint256 assets);
    event RedeemRequested(address indexed controller, uint256 shares);
    event RedeemFulfilled(address indexed controller, uint256 assets);
    event CapitalDeployed(uint256 amount);
    event CapitalReturned(uint256 amount);

    modifier onlyLoanRegistry() {
        require(msg.sender == loanRegistry, "Unauthorized");
        _;
    }

    modifier whenNotPaused() {
        require(!emergencyPaused, "Paused");
        _;
    }

    constructor(address _asset)
        ERC4626(IERC20(_asset))
        ERC20("CredGate Vault Share", "cgUSDT")
        Ownable(msg.sender)
    {}

    function setLoanRegistry(address _registry) external onlyOwner {
        loanRegistry = _registry;
    }

    function setEmergencyPaused(bool _paused) external onlyOwner {
        emergencyPaused = _paused;
    }

    // --- ERC-7540 Async Deposit ---
    function requestDeposit(uint256 assets, address controller) external whenNotPaused nonReentrant {
        require(pendingDeposits[controller] == 0, "Pending request exists");
        IERC20(asset()).transferFrom(msg.sender, address(this), assets);
        pendingDeposits[controller] = assets;
        emit DepositRequested(controller, assets);
    }

    function fulfillDeposit(address controller) external onlyLoanRegistry nonReentrant {
        uint256 assets = pendingDeposits[controller];
        require(assets > 0, "No pending deposit");
        pendingDeposits[controller] = 0;
        claimableDeposits[controller] = assets;
        emit DepositFulfilled(controller, assets);
    }

    function claimDeposit(address receiver) external nonReentrant returns (uint256 shares) {
        uint256 assets = claimableDeposits[msg.sender];
        require(assets > 0, "Nothing to claim");
        claimableDeposits[msg.sender] = 0;
        shares = previewDeposit(assets);
        _mint(receiver, shares);
    }

    // --- ERC-7540 Async Redeem ---
    function requestRedeem(uint256 shares, address controller) external whenNotPaused nonReentrant {
        require(pendingRedeems[controller] == 0, "Pending redeem exists");
        _transfer(msg.sender, address(this), shares);
        pendingRedeems[controller] = shares;
        emit RedeemRequested(controller, shares);
    }

    function fulfillRedeem(address controller) external onlyLoanRegistry nonReentrant {
        uint256 shares = pendingRedeems[controller];
        require(shares > 0, "No pending redeem");
        uint256 assets = previewRedeem(shares);
        require(IERC20(asset()).balanceOf(address(this)) >= assets, "Insufficient liquidity");
        pendingRedeems[controller] = 0;
        claimableRedeems[controller] = assets;
        _burn(address(this), shares);
        emit RedeemFulfilled(controller, assets);
    }

    function claimRedeem(address receiver) external nonReentrant returns (uint256 assets) {
        assets = claimableRedeems[msg.sender];
        require(assets > 0, "Nothing to claim");
        claimableRedeems[msg.sender] = 0;
        IERC20(asset()).transfer(receiver, assets);
    }

    // --- Loan Capital Management ---
    function deployCapital(address borrower, uint256 amount) external onlyLoanRegistry nonReentrant {
        require(IERC20(asset()).balanceOf(address(this)) >= amount, "Insufficient vault balance");
        totalDeployed += amount;
        IERC20(asset()).transfer(borrower, amount);
        emit CapitalDeployed(amount);
    }

    function returnCapital(uint256 amount) external onlyLoanRegistry nonReentrant {
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);
        totalDeployed -= amount;
        emit CapitalReturned(amount);
    }

    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + totalDeployed;
    }
}
```

**1.5 LoanRegistry.sol** (Loan Lifecycle Management)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LoanRegistry is Ownable {
    enum LoanStatus { Pending, Active, Repaid, Defaulted }

    struct Loan {
        uint256 loanId;
        address borrower;
        uint256 principal;
        uint256 interestRate; // basis points
        uint256 duration;     // seconds
        uint256 walletScoreSnapshot;
        LoanStatus status;
        bytes32 repaymentTxHash;
        uint256 createdAt;
        uint256 dueTimestamp;
    }

    address public vault;
    address public ownershipNFT;
    address public asset;
    address public uscAdapter;
    address public oracle;

    uint256 public nextLoanId;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;

    event LoanRegistered(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event LoanFunded(uint256 indexed loanId);
    event LoanRepaid(uint256 indexed loanId, bytes32 repaymentTxHash);
    event LoanDefaulted(uint256 indexed loanId);

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == uscAdapter, "Unauthorized");
        _;
    }

    constructor(address _vault, address _nft, address _asset) Ownable(msg.sender) {
        vault = _vault;
        ownershipNFT = _nft;
        asset = _asset;
    }

    function setOracle(address _oracle) external onlyOwner { oracle = _oracle; }
    function setUSCAdapter(address _usc) external onlyOwner { uscAdapter = _usc; }

    function registerLoan(
        address borrower,
        uint256 principal,
        uint256 interestRate,
        uint256 duration,
        uint256 walletScore
    ) external onlyOwner returns (uint256) {
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            loanId: loanId,
            borrower: borrower,
            principal: principal,
            interestRate: interestRate,
            duration: duration,
            walletScoreSnapshot: walletScore,
            status: LoanStatus.Pending,
            repaymentTxHash: bytes32(0),
            createdAt: block.timestamp,
            dueTimestamp: block.timestamp + duration
        });
        borrowerLoans[borrower].push(loanId);
        emit LoanRegistered(loanId, borrower, principal);
        return loanId;
    }

    function fundLoan(uint256 loanId) external onlyOwner {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Pending, "Not pending");
        loan.status = LoanStatus.Active;
        // CreditVault deploys capital to borrower
        ICreditVault(vault).deployCapital(loan.borrower, loan.principal);
        emit LoanFunded(loanId);
    }

    function markRepaid(uint256 loanId, bytes32 repaymentTxHash) external onlyOracle {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Not active");
        loan.status = LoanStatus.Repaid;
        loan.repaymentTxHash = repaymentTxHash;
        emit LoanRepaid(loanId, repaymentTxHash);
    }

    function markDefaulted(uint256 loanId) external onlyOwner {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Not active");
        require(block.timestamp > loan.dueTimestamp, "Not yet due");
        loan.status = LoanStatus.Defaulted;
        emit LoanDefaulted(loanId);
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getBorrowerLoanCount(address borrower) external view returns (uint256) {
        return borrowerLoans[borrower].length;
    }
}

interface ICreditVault {
    function deployCapital(address borrower, uint256 amount) external;
    function returnCapital(uint256 amount) external;
}
```

**1.6 USCAdapter.sol** (Cross-Chain Repayment Verification)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INativeQueryVerifier.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USCAdapter is Ownable {
    INativeQueryVerifier public constant VERIFIER = INativeQueryVerifier(address(0x0FD2));
    address public loanRegistry;

    struct ExpectedRepayment {
        uint256 loanId;
        address borrower;
        uint256 expectedAmount;
        address expectedRecipient;
        bool verified;
    }

    mapping(uint256 => ExpectedRepayment) public expectedRepayments;

    event RepaymentVerified(uint256 indexed loanId, bytes32 txHash);
    event RepaymentRegistered(uint256 indexed loanId, address borrower, uint256 amount);

    constructor(address _loanRegistry) Ownable(msg.sender) {
        loanRegistry = _loanRegistry;
    }

    function registerExpectedRepayment(
        uint256 loanId,
        address borrower,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        expectedRepayments[loanId] = ExpectedRepayment({
            loanId: loanId,
            borrower: borrower,
            expectedAmount: amount,
            expectedRecipient: recipient,
            verified: false
        });
        emit RepaymentRegistered(loanId, borrower, amount);
    }

    function verifyRepayment(
        uint256 loanId,
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTx,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external {
        ExpectedRepayment storage expected = expectedRepayments[loanId];
        require(!expected.verified, "Already verified");

        // Verify cross-chain transaction via USC precompile
        VERIFIER.verifyAndEmit(chainKey, blockHeight, encodedTx, merkleProof, continuityProof);

        // Mark as verified
        expected.verified = true;

        // Notify loan registry
        ILoanRegistry(loanRegistry).markRepaid(loanId, keccak256(encodedTx));

        emit RepaymentVerified(loanId, keccak256(encodedTx));
    }
}

interface ILoanRegistry {
    function markRepaid(uint256 loanId, bytes32 repaymentTxHash) external;
}
```

**1.7 foundry.toml**
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer-runs = 200
fuzz = { runs = 500 }
invariant = { runs = 128, depth = 50 }

[rpc_endpoints]
creditcoin_testnet = "https://rpc.cc3-testnet.creditcoin.network"
sepolia = "${SEPOLIA_RPC_URL}"

[etherscan]
creditcoin_testnet = { key = "", url = "https://creditcoin-testnet.blockscout.com/api" }
```

---

#### Phase 2: Backend API (Days 4-6)

**2.1 Project Setup**
```
backend/
  src/
    config/
      index.ts          # Environment variables
      chains.ts         # Viem chain + client config
      prisma.ts         # PrismaClient singleton
    middleware/
      errorHandler.ts   # Centralized error handling
      validate.ts       # Zod request validation
    routes/
      scoring.routes.ts
      loans.routes.ts
      vault.routes.ts
      rwa.routes.ts
    controllers/
      scoring.controller.ts
      loans.controller.ts
      vault.controller.ts
      rwa.controller.ts
    services/
      scoring.service.ts       # Wallet reputation computation
      loan.service.ts          # Loan orchestration
      vault.service.ts         # Vault interaction
      blockchain.service.ts    # Viem client interactions
      usc.service.ts           # Off-chain worker for USC verification
      blockscout.service.ts    # Explorer API queries
    types/
      index.ts
    app.ts
    server.ts
  prisma/
    schema.prisma
  package.json
  tsconfig.json
```

**2.2 Prisma Schema**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Wallet {
  address         String    @id @db.VarChar(42)
  createdAt       DateTime  @default(now())
  scores          WalletScore[]
  rwaProofs       RWAProof[]
  borrowerLoans   Loan[]    @relation("BorrowerLoans")
  deposits        VaultDeposit[]
}

model WalletScore {
  id              String    @id @default(cuid())
  walletAddress   String    @db.VarChar(42)
  wallet          Wallet    @relation(fields: [walletAddress], references: [address])
  overallScore    Int       // 0-100
  walletAge       Int       // days
  txFrequency     Int
  crossChainScore Int       // 0-100
  defiScore       Int       // 0-100
  liquidationCount Int      @default(0)
  repaymentCount  Int       @default(0)
  creditLimit     BigInt    // in token smallest units
  riskTier        RiskTier
  inputMetrics    Json
  onChainTxHash   String?   @db.VarChar(66)
  createdAt       DateTime  @default(now())

  @@index([walletAddress, createdAt(sort: Desc)])
}

enum RiskTier { A B C D F }

model RWAProof {
  id              String    @id @default(cuid())
  tokenId         Int?
  walletAddress   String    @db.VarChar(42)
  wallet          Wallet    @relation(fields: [walletAddress], references: [address])
  assetType       String
  documentHash    String    @db.VarChar(66)
  metadataURI     String
  status          ProofStatus @default(PENDING)
  mintTxHash      String?   @db.VarChar(66)
  createdAt       DateTime  @default(now())

  @@index([walletAddress])
}

enum ProofStatus { PENDING VERIFIED MINTED }

model Loan {
  id                String     @id @default(cuid())
  onChainLoanId     Int?
  borrowerAddress   String     @db.VarChar(42)
  borrower          Wallet     @relation("BorrowerLoans", fields: [borrowerAddress], references: [address])
  principalRaw      BigInt
  interestRateBps   Int
  durationDays      Int
  creditScoreId     String
  status            LoanStatus @default(PENDING)
  disburseTxHash    String?    @db.VarChar(66)
  repayTxHash       String?    @db.VarChar(66)
  uscVerifyTxHash   String?    @db.VarChar(66)
  createdAt         DateTime   @default(now())
  fundedAt          DateTime?
  repaidAt          DateTime?
  verifiedAt        DateTime?

  @@index([borrowerAddress, status])
}

enum LoanStatus {
  PENDING
  ACTIVE
  REPAYMENT_PENDING
  VERIFIED
  SETTLED
  DEFAULTED
}

model VaultDeposit {
  id              String    @id @default(cuid())
  depositorAddress String   @db.VarChar(42)
  depositor       Wallet    @relation(fields: [depositorAddress], references: [address])
  amountRaw       BigInt
  sharesReceived  BigInt?
  status          DepositStatus @default(PENDING)
  requestTxHash   String?   @db.VarChar(66)
  claimTxHash     String?   @db.VarChar(66)
  requestedAt     DateTime  @default(now())
  claimedAt       DateTime?

  @@index([depositorAddress])
}

enum DepositStatus { PENDING CLAIMABLE CLAIMED }
```

**2.3 Scoring Service**
```typescript
// backend/src/services/scoring.service.ts
interface WalletMetrics {
  walletAge: number;        // days
  txFrequency: number;      // tx count
  crossChainActivity: number; // 0-100
  defiUsage: number;        // 0-100
  liquidationCount: number;
  repaymentCount: number;
}

interface ScoreResult {
  overallScore: number;     // 0-100
  creditLimit: bigint;      // in USDT smallest units
  riskTier: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: WalletMetrics;
}

// Scoring formula constants
const BASE_LIMIT = 500_000000n; // 500 USDT base
const ALPHA = 50_000000n;       // score multiplier (50 USDT per point)
const BETA = 30_000000n;        // RWA confidence multiplier
const RISK_PENALTY = 100_000000n; // penalty per liquidation

function computeWalletScore(metrics: WalletMetrics): number {
  const ageFactor = Math.min(metrics.walletAge / 365, 1) * 20;
  const txFactor = Math.min(metrics.txFrequency / 500, 1) * 20;
  const crossChainFactor = (metrics.crossChainActivity / 100) * 15;
  const defiFactor = (metrics.defiUsage / 100) * 15;
  const repaymentFactor = Math.min(metrics.repaymentCount / 10, 1) * 30;
  const liquidationPenalty = metrics.liquidationCount * 10;

  return Math.max(0, Math.min(100, Math.round(
    ageFactor + txFactor + crossChainFactor + defiFactor + repaymentFactor - liquidationPenalty
  )));
}

function computeCreditLimit(score: number, rwaConfidence: number): bigint {
  return BASE_LIMIT
    + BigInt(score) * ALPHA
    + BigInt(rwaConfidence) * BETA
    - BigInt(0) * RISK_PENALTY; // risk penalty applied separately
}

function getRiskTier(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}
```

**2.4 API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scoring/compute` | Compute wallet score |
| GET | `/api/scoring/:address` | Get cached score |
| POST | `/api/rwa/submit` | Submit RWA proof for verification |
| POST | `/api/rwa/mint` | Mint SBT proof NFT |
| GET | `/api/rwa/:address` | Get wallet's RWA proofs |
| POST | `/api/loans/request` | Request a new loan |
| POST | `/api/loans/:id/fund` | Fund an approved loan |
| POST | `/api/loans/:id/repay` | Record repayment tx hash |
| GET | `/api/loans/:address` | Get wallet's loans |
| POST | `/api/vault/deposit` | Record deposit request |
| POST | `/api/vault/redeem` | Record redeem request |
| GET | `/api/vault/stats` | Get vault TVL and stats |
| GET | `/api/health` | Health check |

**2.5 USC Off-chain Worker**
```typescript
// backend/src/services/usc.service.ts
// Listens for repayment events on Sepolia
// Generates proofs via USC Proof Generation API
// Submits verification to USCAdapter contract on Creditcoin

async function processRepayment(loanId: number, sepoliaTxHash: string) {
  // 1. Wait for Sepolia tx confirmation (12+ blocks)
  // 2. Wait for Creditcoin attestation of Sepolia block
  // 3. Call Proof Generation API for MerkleProof + ContinuityProof
  // 4. Submit verifyRepayment() to USCAdapter on Creditcoin
  // 5. Update loan status in PostgreSQL
}
```

---

#### Phase 3: Frontend Integration (Days 6-8)

**3.1 Web3 Setup**

Install dependencies:
```bash
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

Creditcoin chain definition:
```typescript
// frontend/app/config/chains.ts
import { defineChain } from 'viem'

export const creditcoinTestnet = defineChain({
  id: 102031,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'tCTC', symbol: 'tCTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://creditcoin-testnet.blockscout.com' },
  },
  testnet: true,
})
```

Provider wrapper:
```typescript
// frontend/app/providers.tsx
"use client"
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#4ef2e8' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**3.2 Frontend Integration Points**

| Page | Current State | Integration Needed |
|------|--------------|-------------------|
| Navbar | Static "Connect Wallet" | RainbowKit `ConnectButton` |
| Dashboard | Hardcoded score=825 | `GET /api/scoring/:address` -> dynamic CreditScoreRing |
| Dashboard | Static activity chart | `GET /api/scoring/:address` -> real metrics |
| Supply | Static asset list | `useReadContract` for vault stats + `POST /api/vault/deposit` |
| Supply Modal | Non-functional submit | `useWriteContract` for `requestDeposit` + `approve` |
| Borrow | Static borrow amounts | `GET /api/loans/:address` + credit line from scoring |
| RWA | Static tokenize form | `POST /api/rwa/submit` + `POST /api/rwa/mint` for SBT minting |

---

#### Phase 4: Cross-Chain Integration (Days 8-10)

**4.1 USC Integration Flow**
1. Backend listens for repayment events on Sepolia (via Alchemy WebSocket or polling)
2. When repayment detected, wait for 12+ Sepolia block confirmations
3. Query Creditcoin for attestation of the Sepolia block
4. Call USC Proof Generation API to get MerkleProof + ContinuityProof
5. Submit `verifyRepayment()` transaction to USCAdapter on Creditcoin testnet
6. USCAdapter calls `markRepaid()` on LoanRegistry
7. LoanRegistry emits `LoanRepaid` event
8. Backend updates PostgreSQL loan status
9. Frontend shows repayment verified status

**4.2 Sepolia Deployment**
- Deploy a simple `RepaymentReceiver.sol` on Sepolia to receive repayments
- This contract holds the expected repayment address for USC to verify against

---

#### Phase 5: Testing & Deployment (Days 10-12)

**5.1 Foundry Tests**

Unit tests for each contract:
- `CreditVault.t.sol`: requestDeposit, fulfillDeposit, claimDeposit, requestRedeem, deployCapital, returnCapital
- `LoanRegistry.t.sol`: registerLoan, fundLoan, markRepaid, markDefaulted
- `OwnershipProofNFT.t.sol`: mintProof, transfer blocking, getOwnerProofCount
- `USCAdapter.t.sol`: registerExpectedRepayment, verifyRepayment (with mock verifier)

Fuzz tests:
- Deposit/redeem with arbitrary amounts (bounded to realistic ranges)
- Credit limit calculation with random scores
- Share conversion round-trip accuracy

Key invariants:
- Vault USDT balance >= total shares value
- Total deployed capital == sum of active loan principals
- No loan disbursement exceeds vault balance

**5.2 Deployment Script**
```solidity
// contracts/script/Deploy.s.sol
contract DeployAll is Script {
    function run() public {
        vm.startBroadcast();

        MockUSDT usdt = new MockUSDT();
        CreditVault vault = new CreditVault(address(usdt));
        OwnershipProofNFT nft = new OwnershipProofNFT();
        LoanRegistry registry = new LoanRegistry(address(vault), address(nft), address(usdt));
        USCAdapter usc = new USCAdapter(address(registry));

        vault.setLoanRegistry(address(registry));
        registry.setUSCAdapter(address(usc));

        // Mint initial USDT for testing
        usdt.mint(msg.sender, 1_000_000 * 10**6); // 1M USDT

        vm.stopBroadcast();
    }
}
```

Deploy command:
```bash
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

#### Phase 6: Polish & Demo (Days 12-14)

- End-to-end testing of the 7-step demo flow on testnet
- Error handling and loading states in frontend
- Demo data seeding (pre-scored wallets, pre-minted proofs)
- Presentation preparation

---

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| On-chain scoring (Solidity) | Complex logic doesn't belong on-chain; gas costs prohibitive |
| Hardhat over Foundry | User preference + Creditcoin USC examples use Foundry |
| SQLite for database | Not production-grade; Prisma + PostgreSQL provides type safety |
| ethers.js over viem | Viem is newer, lighter, TypeScript-first, same team as Wagmi |
| Next.js API routes for backend | Separation of concerns; dedicated Express backend is cleaner |
| Mock USC verification | Loses Creditcoin's key differentiator for hackathon judges |
| Native tCTC for loans | Mock USDT is more realistic for a credit protocol demo |

## Acceptance Criteria

### Functional Requirements
- [ ] Wallet connects via RainbowKit to Creditcoin testnet
- [ ] Wallet score computed from real chain data (with mock fallback)
- [ ] RWA ownership proof SBT can be minted from /rwa page
- [ ] Credit line calculated based on wallet score + RWA proofs
- [ ] Loan can be registered and funded from CreditVault
- [ ] Loan disbursed in mock USDT to borrower wallet
- [ ] Repayment submitted on Ethereum Sepolia
- [ ] USC precompile verifies cross-chain repayment on Creditcoin
- [ ] Vault unlocks LP redemptions after verified repayment
- [ ] All 7 demo steps functional end-to-end

### Non-Functional Requirements
- [ ] Smart contract tests pass (Foundry `forge test`)
- [ ] API responses < 2 seconds
- [ ] Responsive UI on desktop
- [ ] Clean error states for failed transactions

## Success Metrics
- Complete 7-step demo flow in under 5 minutes
- All smart contracts deployed and verified on Creditcoin testnet
- Wallet scoring returns different results for different wallets
- Cross-chain verification provably uses USC precompile

## Dependencies & Prerequisites
- Creditcoin testnet faucet (tCTC for gas)
- WalletConnect project ID (for RainbowKit)
- Sepolia ETH for repayment testing
- PostgreSQL instance (local Docker or cloud)
- Alchemy/Moralis API key (for Ethereum wallet data)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| USC precompile complexity | Medium | High | Use reference examples, have mock fallback |
| ERC-7540 implementation bugs | Medium | High | Start from reference impl, test thoroughly |
| Creditcoin testnet downtime | Low | High | Local Foundry testing, Sepolia-only backup |
| Real API rate limits | Medium | Medium | Cache aggressively, mock fallback data |
| Timeline overflow | Medium | High | Prioritize contracts first, polish last |
| Cross-chain proof gen failure | Medium | Medium | Retry with exponential backoff, queue failed proofs |

## References & Research

### Internal References
- Existing frontend: `frontend/app/` (Next.js 16, all pages built)
- Design system: `frontend/app/globals.css` (CSS variables, neon theme)
- Mock data patterns: `frontend/app/dashboard/components/CreditScoreRing/CreditScoreRing.tsx:1`

### External References
- [Creditcoin USC Docs](https://docs.creditcoin.org/usc)
- [USC Bridge Examples](https://github.com/gluwa/usc-testnet-bridge-examples)
- [EIP-7540 Spec](https://eips.ethereum.org/EIPS/eip-7540)
- [ERC-7540 Reference Impl](https://github.com/ERC4626-Alliance/ERC-7540-Reference)
- [Centrifuge ERC7540Vault.sol](https://github.com/centrifuge/liquidity-pools/blob/main/src/ERC7540Vault.sol)
- [Foundry Docs](https://getfoundry.sh)
- [Wagmi Docs](https://wagmi.sh)
- [RainbowKit Docs](https://rainbowkit.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Viem Docs](https://viem.sh)
- [Creditcoin Testnet Explorer](https://creditcoin-testnet.blockscout.com)
- [Creditcoin Faucet Guide](https://docs.creditcoin.org/wallets/using-testnet-faucet)
