import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { defineChain } from "viem";

export const creditcoinTestnet = defineChain({
    id: 102036,
    name: "CreditCoin USC Testnet",
    nativeCurrency: {
        name: "CreditCoin",
        symbol: "CTC",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ["https://rpc.usc-testnet2.creditcoin.network"],
        },
    },
    blockExplorers: {
        default: {
            name: "CreditCoin Explorer",
            url: "https://explorer.usc-testnet2.creditcoin.network",
        },
    },
    testnet: true,
});

export const wagmiConfig = getDefaultConfig({
    appName: "CredGate",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
    chains: [creditcoinTestnet, mainnet, sepolia],
    ssr: true,
});