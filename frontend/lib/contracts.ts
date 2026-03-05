import CredgateUSD from "@/lib/CredgateUSD.sol/CredgateUSD.json"
import CreditVault from "@/lib/CreditVault.sol/CreditVault.json"
import ICreditAggregator from "@/lib/CreditVault.sol/ICreditAggregator.json";

export const CONTRACTS = {
    CDUSD: "0x47878958595E4F5CA7545ebCbDD35fE2FD9aD6BC" as `0x${string}`,
    CREDIT_VAULT: "0x6f02C7BFd93050F014515FF407599dc8E651A17e" as `0x${string}`,
    CREDIT_AGGREGATOR: "0x04F3aBf34A59AB5e3F1555b678D256Fe8DfF9059" as `0x${string}`,
} as const;

export const CDUSD_ABI = CredgateUSD.abi;
export const CREDIT_VAULT_ABI = CreditVault.abi;
export const CREDIT_AGGREGATOR_ABI = ICreditAggregator.abi;

