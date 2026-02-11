# Best Practices Research - CredGate

## 1. ERC-7540 Async Vault

### Reference Implementations
- **ERC4626-Alliance Reference**: `github.com/ERC4626-Alliance/ERC-7540-Reference`
- **Centrifuge Production**: `github.com/centrifuge/liquidity-pools/blob/main/src/ERC7540Vault.sol`

### Key Interfaces (EIP-7540)
```solidity
interface IERC7540Deposit {
    function requestDeposit(uint256 assets, address controller, address owner) external returns (uint256 requestId);
    function pendingDepositRequest(uint256 requestId, address controller) external view returns (uint256);
    function deposit(uint256 assets, address receiver, address controller) external returns (uint256 shares);
}

interface IERC7540Redeem {
    function requestRedeem(uint256 shares, address controller, address owner) external returns (uint256 requestId);
    function pendingRedeemRequest(uint256 requestId, address controller) external view returns (uint256);
    function redeem(uint256 shares, address receiver, address controller) external returns (uint256 assets);
}
```

### Security Considerations
- Apply `ReentrancyGuard` to all fulfillment paths
- Follow Checks-Effects-Interactions pattern strictly
- Pro-rata distribution: careful rounding for batched requests
- Emergency pause switch for fulfillment operations
- Operator pattern: track authorized operators per controller

### Architecture for CredGate
- Deposits queued as `requestDeposit` -> operator fulfills -> user claims via `deposit`
- Redemptions gated by loan repayment status
- LoanRegistry acts as the operator that can fulfill/deny requests

## 2. Soulbound Token (SBT) for RWA Proofs

### Approach: ERC-721 with transfer disabled
```solidity
function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
    address from = _ownerOf(tokenId);
    if (from != address(0) && to != address(0)) revert SoulboundTransferBlocked();
    return super._update(to, tokenId, auth);
}
```

### Metadata: Hybrid on-chain + IPFS
- Store `documentHash`, `source`, `verifiedAt` on-chain
- Full document metadata on IPFS (hash referenced on-chain)
- `tokenURI` returns IPFS gateway URL

## 3. USC Cross-Chain Verification

### Precompile at `0x0FD2`
```solidity
interface INativeQueryVerifier {
    struct MerkleProof { ... }
    struct ContinuityProof { ... }
    function verifyAndEmit(uint64 chainKey, uint64 blockHeight, bytes encodedTx, MerkleProof, ContinuityProof) external;
}
```

### Off-chain Worker Pattern
1. Listen for repayment events on Sepolia
2. Wait for block attestation on Creditcoin (~15s)
3. Generate Merkle + Continuity proofs via Proof Generation API
4. Submit to USC contract on Creditcoin
5. Emit verification event -> LoanRegistry marks loan as verified

## 4. Credit Scoring (Off-chain)

### Deterministic Formula
```
walletScore = clamp(0, 100,
    ageFactor * 20 +
    txFreqFactor * 20 +
    crossChainFactor * 15 +
    defiFactor * 15 +
    repaymentFactor * 30 -
    liquidationPenalty
)

creditLimit = baseLimit + walletScore * α + rwaConfidence * β - riskPenalty
```

### Caching Strategy
- Cache wallet metrics for 1 hour (blockchain data doesn't change fast)
- Store score snapshots in PostgreSQL for audit trail
- Record score on-chain at loan issuance time

## 5. Express.js + Prisma for DeFi

### Money Storage
- Use `BigInt` for on-chain amounts (smallest token unit)
- Use `Int` for basis points and scores
- Avoid `Float` entirely
- Use `Decimal(18,2)` only for display values

### Error Handling
- Custom `BlockchainError` class with retryable flag
- Exponential backoff for RPC failures
- Separate error types: RPC timeout, insufficient gas, nonce conflicts

## 6. Foundry Testing

### Structure
```
test/
  unit/          # Individual contract tests
  fuzz/          # Property-based fuzz tests (bound to realistic ranges)
  invariant/     # Stateful invariant tests with handlers
  integration/   # Full lifecycle tests
  helpers/       # BaseTest.sol, mocks
```

### Key Invariants
- Vault USDT balance >= total shares value (solvency)
- Total share supply == sum of all holder balances
- Loan disbursements never exceed vault balance

## 7. Wagmi + RainbowKit

### Custom Chain
```typescript
import { defineChain } from 'viem'
export const creditcoinTestnet = defineChain({
  id: 102031,
  name: 'Creditcoin Testnet',
  nativeCurrency: { name: 'tCTC', symbol: 'tCTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.cc3-testnet.creditcoin.network'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://creditcoin-testnet.blockscout.com' } },
  testnet: true,
})
```

### Transaction Pattern
```typescript
const { data: hash, writeContract, isPending } = useWriteContract()
const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
```
