import { useState } from "react";
import { useWalletClient } from "wagmi";
import { parseUnits, createPublicClient, custom } from "viem";
import { CREDIT_VAULT_ABI, CDUSD_ABI, CONTRACTS } from "@/lib/contracts";
import { creditcoinTestnet } from "@/lib/wagmi.config";

const CDUSD_DECIMALS = 6;

export type DepositStep =
    | "idle"
    | "approving"
    | "awaiting_approve"
    | "depositing"
    | "awaiting_deposit"
    | "success"
    | "error";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function useDepositFlow() {
    const { data: walletClient } = useWalletClient();

    const [step, setStep] = useState<DepositStep>("idle");
    const [error, setError] = useState<string | null>(null);

    const reset = () => {
        setStep("idle");
        setError(null);
    };

    const deposit = async (
        address: `0x${string}`,
        amount: string,
        currentAllowance: bigint
    ) => {
        if (!walletClient) {
            setError("Wallet not connected");
            setStep("error");
            return;
        }
        const publicClient = createPublicClient({
            chain: creditcoinTestnet,
            transport: custom(walletClient.transport),
        });

        console.log("walletClient chain:", walletClient.chain?.id, walletClient.chain?.name);
        console.log("walletClient transport:", walletClient.transport);

        const parsedAmount = parseUnits(amount, CDUSD_DECIMALS);
        setError(null);

        try {
            // Live allowance check via wallet's transport
            const onChainAllowance = await publicClient.readContract({
                address: CONTRACTS.CDUSD,
                abi: CDUSD_ABI,
                functionName: "allowance",
                args: [address, CONTRACTS.CREDIT_VAULT],
            }) as bigint;

            console.log("Live allowance:", onChainAllowance.toString(), "/ need:", parsedAmount.toString());

            if (onChainAllowance < parsedAmount) {
                console.log("🔏 Submitting approve…");
                setStep("approving");

                const approveHash = await walletClient.writeContract({
                    address: CONTRACTS.CDUSD,
                    abi: CDUSD_ABI,
                    functionName: "approve",
                    args: [CONTRACTS.CREDIT_VAULT, parsedAmount],
                    chain: creditcoinTestnet,
                    account: address,
                });

                console.log(" Approve hash:", approveHash);
                setStep("awaiting_approve");

                // Poll via wallet's own transport
                let approveReceipt = null;
                for (let i = 0; i < 60; i++) {
                    await sleep(2000);
                    try {
                        approveReceipt = await publicClient.getTransactionReceipt({
                            hash: approveHash,
                        });
                        if (approveReceipt) {
                            console.log(` Approve confirmed (poll ${i + 1}):`, approveReceipt.status);
                            break;
                        }
                        console.log(`Poll ${i + 1}: pending`);
                    } catch (e: any) {
                        console.log(`Poll ${i + 1}: ${e?.message}`);
                    }
                }

                if (!approveReceipt) throw new Error("Approve receipt not found after 2 min");
                if (approveReceipt.status === "reverted") throw new Error("Approve tx reverted");

                await sleep(1000);

             
                const newAllowance = await publicClient.readContract({
                    address: CONTRACTS.CDUSD,
                    abi: CDUSD_ABI,
                    functionName: "allowance",
                    args: [address, CONTRACTS.CREDIT_VAULT],
                }) as bigint;

                console.log("Allowance post-approval:", newAllowance.toString());
                if (newAllowance < parsedAmount) {
                    throw new Error(`Allowance still too low: ${newAllowance} < ${parsedAmount}`);
                }
            }

           
            console.log("💰 Submitting deposit…");
            setStep("depositing");

            const depositHash = await walletClient.writeContract({
                address: CONTRACTS.CREDIT_VAULT,
                abi: CREDIT_VAULT_ABI,
                functionName: "deposit",
                args: [parsedAmount, address],
                chain: creditcoinTestnet,
                account: address,
            });

            console.log("Deposit hash:", depositHash);
            setStep("awaiting_deposit");

            let depositReceipt = null;
            for (let i = 0; i < 60; i++) {
                await sleep(2000);
                try {
                    depositReceipt = await publicClient.getTransactionReceipt({
                        hash: depositHash,
                    });
                    if (depositReceipt) {
                        console.log(`Deposit confirmed (poll ${i + 1}):`, depositReceipt.status);
                        break;
                    }
                    console.log(`⏳ Poll ${i + 1}: pending`);
                } catch (e: any) {
                    console.log(`⏳ Poll ${i + 1}: ${e?.message}`);
                }
            }

            if (!depositReceipt) throw new Error("Deposit receipt not found after 2 min");
            if (depositReceipt.status === "reverted") throw new Error("Deposit tx reverted");

            console.log("🎉 Deposit complete!");
            setStep("success");

        } catch (err: any) {
            console.error(" Deposit flow error:", err?.shortMessage ?? err?.message, err);

            if (err?.code === 4001 || err?.message?.includes("rejected") || err?.message?.includes("denied")) {
                setError("Transaction rejected by user");
            } else if (err?.message?.includes("reverted")) {
                setError("Transaction reverted — check your balance");
            } else {
                setError(err?.shortMessage ?? err?.message ?? "Transaction failed");
            }

            setStep("error");
        }
    };

    return { step, error, deposit, reset };
}