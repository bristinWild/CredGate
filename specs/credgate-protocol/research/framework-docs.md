# Framework Documentation Research - CredGate

## 1. Creditcoin 3.0 / USC

### Network Configuration
| Parameter | Testnet | Mainnet |
|-----------|---------|---------|
| Chain ID | `102031` (`0x18e8f`) | `102030` (`0x18e8e`) |
| RPC HTTPS | `https://rpc.cc3-testnet.creditcoin.network` | `https://mainnet3.creditcoin.network` |
| RPC WSS | `wss://rpc.cc3-testnet.creditcoin.network` | `wss://mainnet3.creditcoin.network` |
| Explorer | `creditcoin-testnet.blockscout.com` | `creditcoin.blockscout.com` |
| Currency | tCTC (18 dec) | CTC (18 dec) |
| Faucet | Discord `#creditcoin-faucet`: `/faucet address: 0xYOUR_ADDRESS` (100 tCTC/24hr) |

### USC (Universal Smart Contracts)
- **Purpose**: Cross-chain transaction verification without bridges
- **Precompile**: `0x0FD2` (Native Query Verifier)
- **Status**: Testnet only (not mainnet yet)
- **Reference**: `github.com/gluwa/usc-testnet-bridge-examples`

### Key USC Interfaces
```solidity
interface INativeQueryVerifier {
    struct MerkleProof {
        bytes encodedReceipt;
        bytes[] receiptProof;
        uint64 receiptIndex;
    }
    struct ContinuityProof {
        bytes32 parentBeaconBlockRoot;
        bytes32 beaconBlockRoot;
        bytes32[] proof;
    }
    function verifyAndEmit(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTx,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external;
}
```

### USC Off-chain Worker Pattern
1. Listen for source chain (Sepolia) events
2. Wait for attestation (~15s block time)
3. Call Proof Generation API for Merkle + Continuity proofs
4. Submit `verifyAndEmit()` on Creditcoin via USCAdapter contract
5. Use `EvmV1Decoder` to extract tx fields from verified data

### Deployment (Foundry)
```bash
forge create --rpc-url https://rpc.cc3-testnet.creditcoin.network \
  --private-key $PRIVATE_KEY src/MyContract.sol:MyContract
```

### npm Packages
- `@gluwa/creditcoin-public-prover` - Prover.sol for USC
- `@polkadot/api` (v16.1.1+) - Substrate layer

## 2. ERC-7540 (Asynchronous ERC-4626)

### Spec: [eips.ethereum.org/EIPS/eip-7540](https://eips.ethereum.org/EIPS/eip-7540)
### Reference: [github.com/ERC4626-Alliance/ERC-7540-Reference](https://github.com/ERC4626-Alliance/ERC-7540-Reference)
### Production: [github.com/centrifuge/liquidity-pools](https://github.com/centrifuge/liquidity-pools)

### Key Extension over ERC-4626
- Adds async `requestDeposit` / `requestRedeem` with controller pattern
- Operator authorization via EIP-712 signatures
- Pending -> Claimable -> Claimed state machine
- Backward compatible with ERC-4626 `deposit` and `redeem`

### Core Flow
1. User calls `requestDeposit(assets, controller, owner)` - assets locked
2. Operator/admin fulfills the request (off-chain verification)
3. User calls `deposit(assets, receiver, controller)` - shares minted
4. For redemption: `requestRedeem` -> fulfillment -> `redeem`

## 3. Foundry

### foundry.toml for Creditcoin
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

### Deployment Script Pattern
```solidity
pragma solidity ^0.8.20;
import "forge-std/Script.sol";

contract DeployAll is Script {
    function run() public {
        vm.startBroadcast();
        MockUSDT usdt = new MockUSDT();
        CreditVault vault = new CreditVault(address(usdt));
        OwnershipProofNFT nft = new OwnershipProofNFT();
        LoanRegistry registry = new LoanRegistry(address(vault), address(nft), address(usdt));
        USCAdapter usc = new USCAdapter(address(registry));
        vault.setLoanRegistry(address(registry));
        vm.stopBroadcast();
    }
}
```

### Testing: `forge test -vvv`
### Fork testing: `forge test --fork-url https://rpc.cc3-testnet.creditcoin.network`
### Gas report: `forge test --gas-report`

## 4. Wagmi v2 + RainbowKit v2

### Install
```bash
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

### Key Hooks
| Hook | Purpose |
|------|---------|
| `useAccount` | Connected wallet address + chain |
| `useReadContract` | Read contract state |
| `useReadContracts` | Batch reads |
| `useWriteContract` | Submit transactions |
| `useWaitForTransactionReceipt` | Track tx confirmation |
| `useWatchContractEvent` | Listen for events |
| `useSwitchChain` | Switch between chains |
| `useBalance` | Get token balances |

### Transaction Lifecycle
```
Idle -> isPending (wallet popup) -> hash received -> isConfirming (on-chain) -> isConfirmed
```

## 5. Prisma + PostgreSQL

### Schema Design for Financial Data
- `BigInt` for on-chain amounts (token smallest units)
- `Int` for scores (0-100) and basis points
- `Decimal(18,2)` for display amounts only
- Never use `Float` for money

### Migration Workflow
```bash
npx prisma db push          # rapid prototyping (resets DB)
npx prisma migrate dev      # create migration files
npx prisma generate          # regenerate client
npx prisma studio            # visual data browser
```

## 6. Express.js (2025-2026 Patterns)

### Recommended Structure
```
backend/src/
  config/     # env vars, chain config, prisma singleton
  middleware/  # errorHandler, auth (wallet sig), validation (zod), rateLimiter
  routes/     # scoring, loans, vault, rwa
  controllers/ # request handling
  services/   # business logic + blockchain interaction
  types/      # shared TypeScript types
  app.ts      # Express setup
  server.ts   # entry point
```

### Backend Blockchain: Use Viem (not ethers.js)
- 35kB bundle, TypeScript-first, same team as Wagmi
- `createPublicClient` for reads, `createWalletClient` for writes
- Better type inference for contract interactions

### Validation: Zod schemas for request validation
### Auth: Wallet signature verification via `viem.verifyMessage`

## Sources
- [Creditcoin Docs](https://docs.creditcoin.org)
- [USC Product Overview](https://docs.creditcoin.org/usc)
- [EIP-7540](https://eips.ethereum.org/EIPS/eip-7540)
- [Foundry Docs](https://getfoundry.sh)
- [Wagmi Docs](https://wagmi.sh)
- [RainbowKit Docs](https://rainbowkit.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [Viem Docs](https://viem.sh)
