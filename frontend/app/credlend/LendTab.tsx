"use client";

import { useState } from "react";
import {
    useAccount,
    useWriteContract,
    useReadContract,
    useWaitForTransactionReceipt,
    useChainId,
    useSwitchChain,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CREDIT_VAULT_ABI, CDUSD_ABI, CONTRACTS } from "@/lib/contracts";
import { useDepositFlow } from "@/app/credlend/hooks/useDepositFlow";

const CDUSD_DECIMALS = 6;
const SHARES_DECIMALS = 18;
const TARGET_CHAIN_ID = 102036;

export default function LendTab() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();

    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [networkError, setNetworkError] = useState<string | null>(null);

    const { step: depositStep, error: depositFlowError, deposit, reset: resetDeposit } = useDepositFlow();

    const parsedDeposit =
        depositAmount && Number(depositAmount) > 0
            ? parseUnits(depositAmount, CDUSD_DECIMALS)
            : 0n;

    // ── Reads ────────────────────────────────────────────────────────────────

    const { data: cdUSDBalanceRaw, refetch: refetchCdUSDBalance } = useReadContract({
        address: CONTRACTS.CDUSD,
        abi: CDUSD_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 },
    });

    const { data: cvUSDCBalanceRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 },
    });

    const { data: totalAssetsRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "totalAssets",
        query: { refetchInterval: 15000 },
    });

    const { data: totalSupplyRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "totalSupply",
        query: { refetchInterval: 15000 },
    });

    const { data: totalBorrowedRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "totalBorrowed",
        query: { refetchInterval: 15000 },
    });

    const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
        address: CONTRACTS.CDUSD,
        abi: CDUSD_ABI,
        functionName: "allowance",
        args: address ? [address, CONTRACTS.CREDIT_VAULT] : undefined,
        query: { enabled: !!address, refetchInterval: 5000 },
    });

    const { data: previewSharesRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "previewDeposit",
        args: parsedDeposit > 0n ? [parsedDeposit] : undefined,
        query: { enabled: parsedDeposit > 0n },
    });

    const { data: previewAssetsRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "previewRedeem",
        args: withdrawAmount ? [parseUnits(withdrawAmount, SHARES_DECIMALS)] : undefined,
        query: { enabled: !!withdrawAmount && parseFloat(withdrawAmount) > 0 },
    });

    const { data: maxRedeemableRaw } = useReadContract({
        address: CONTRACTS.CREDIT_VAULT,
        abi: CREDIT_VAULT_ABI,
        functionName: "maxRedeem",
        args: address ? [address] : undefined,
        query: { enabled: !!address, refetchInterval: 10000 },
    });

    // ── Typed casts ──────────────────────────────────────────────────────────

    const cdUSDBalance = cdUSDBalanceRaw as bigint | undefined;
    const cvUSDCBalance = cvUSDCBalanceRaw as bigint | undefined;
    const totalAssets = totalAssetsRaw as bigint | undefined;
    const totalSupply = totalSupplyRaw as bigint | undefined;
    const totalBorrowed = totalBorrowedRaw as bigint | undefined;
    const allowance = allowanceRaw as bigint | undefined;
    const previewShares = previewSharesRaw as bigint | undefined;
    const previewAssets = previewAssetsRaw as bigint | undefined;
    const maxRedeemable = maxRedeemableRaw as bigint | undefined;

    // ── Withdraw (wagmi is fine for single-tx) ───────────────────────────────

    const {
        writeContract: writeWithdraw,
        data: withdrawTxHash,
        isPending: withdrawPending,
    } = useWriteContract();

    const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
        useWaitForTransactionReceipt({ hash: withdrawTxHash });

    // ── Deposit step derived booleans ────────────────────────────────────────

    const approvePending =
        depositStep === "approving" || depositStep === "awaiting_approve";
    const depositPending =
        depositStep === "depositing" || depositStep === "awaiting_deposit";
    const isInProgress = approvePending || depositPending;
    const depositSuccess = depositStep === "success";

    const buttonLabel = () => {
        if (depositStep === "approving") return "Sign Approval...";
        if (depositStep === "awaiting_approve") return "Confirming Approval...";
        if (depositStep === "depositing") return "Sign Deposit...";
        if (depositStep === "awaiting_deposit") return "Confirming Deposit...";
        if ((allowance ?? 0n) < parsedDeposit) return "Approve & Deposit";
        return "Deposit";
    };

    // ── Network helpers ──────────────────────────────────────────────────────

    const ensureCorrectNetwork = async (): Promise<boolean> => {
        if (chainId === TARGET_CHAIN_ID) return true;
        try {
            setNetworkError(null);
            await switchChainAsync({ chainId: TARGET_CHAIN_ID });
            return true;
        } catch {
            setNetworkError("Please switch to the correct network in MetaMask");
            return false;
        }
    };

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleDeposit = async () => {
        if (!address || parsedDeposit === 0n) return;
        const ok = await ensureCorrectNetwork();
        if (!ok) return;

        await deposit(address, depositAmount, allowance ?? 0n);

        // After success, refetch balance & clear input
        if (depositStep === "success") {
            setDepositAmount("");
            refetchCdUSDBalance();
            refetchAllowance();
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || !address) return;
        const ok = await ensureCorrectNetwork();
        if (!ok) return;

        writeWithdraw({
            address: CONTRACTS.CREDIT_VAULT,
            abi: CREDIT_VAULT_ABI,
            functionName: "redeem",
            args: [parseUnits(withdrawAmount, SHARES_DECIMALS), address, address],
        });
    };

    // ── Formatters ────────────────────────────────────────────────────────────

    const formatUSDC = (val: bigint | undefined): string =>
        val !== undefined
            ? parseFloat(formatUnits(val, CDUSD_DECIMALS)).toFixed(2)
            : "0.00";

    const formatShares = (val: bigint | undefined): string =>
        val !== undefined
            ? parseFloat(formatUnits(val, SHARES_DECIMALS)).toFixed(4)
            : "0.0000";

    const previewSharesDisplay =
        totalSupply === 0n
            ? parseFloat(depositAmount || "0")
            : parseFloat(formatUnits(previewShares ?? 0n, SHARES_DECIMALS));

    const sharePrice =
        totalSupply && totalAssets && totalSupply > 0n
            ? parseFloat(formatUnits(totalAssets, CDUSD_DECIMALS)) /
            parseFloat(formatUnits(totalSupply, SHARES_DECIMALS))
            : 1;

    const utilization =
        totalAssets && totalBorrowed && totalAssets > 0n
            ? Math.round((Number(totalBorrowed) / Number(totalAssets)) * 100)
            : 0;

    const positionValue = cvUSDCBalance
        ? (
            parseFloat(formatUnits(cvUSDCBalance, SHARES_DECIMALS)) * sharePrice
        ).toFixed(2)
        : "0.00";

    const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

    // ── Not connected ─────────────────────────────────────────────────────────

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-full border border-[var(--color-border)] flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                </div>
                <p className="text-[var(--color-muted)]">
                    Connect your wallet to start earning
                </p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT: Vault Stats ── */}
            <div className="lg:col-span-1 flex flex-col gap-4">

                {/* APY card */}
                <div className="rounded-2xl border border-[rgba(78,242,232,0.3)] bg-[rgba(78,242,232,0.04)] p-6">
                    <p className="text-xs text-[var(--color-muted)] mb-1">Current APY</p>
                    <p className="text-4xl font-bold text-[var(--color-neon)]">10%</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                        Paid by borrowers · Linear accrual
                    </p>
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-[var(--color-muted)]">Utilization</span>
                            <span className="text-white">{utilization}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${utilization}%`,
                                    background:
                                        utilization > 80
                                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                                            : "linear-gradient(90deg, #4ef2e8, #a78bfa)",
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Vault stats */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-6">
                    <h3 className="text-sm font-medium text-white mb-4">Vault Stats</h3>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: "Total Deposits", value: `$${formatUSDC(totalAssets)}` },
                            { label: "Total Borrowed", value: `$${formatUSDC(totalBorrowed)}` },
                            { label: "Share Price", value: `${sharePrice.toFixed(6)} cdUSD` },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-[var(--color-muted)]">{item.label}</span>
                                <span className="text-white font-mono">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Position */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-6">
                    <h3 className="text-sm font-medium text-white mb-4">My Position</h3>
                    <div className="flex flex-col gap-3">
                        {[
                            { label: "cvUSDC Shares", value: formatShares(cvUSDCBalance) },
                            { label: "Position Value", value: `$${positionValue}` },
                            { label: "cdUSD Balance", value: `$${formatUSDC(cdUSDBalance)}` },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-[var(--color-muted)]">{item.label}</span>
                                <span className="text-white font-mono">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Deposit / Withdraw ── */}
            <div className="lg:col-span-2 flex flex-col gap-4">

                {/* Wrong network banner */}
                {isWrongNetwork && (
                    <div
                        style={{
                            padding: "12px 16px",
                            borderRadius: "12px",
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <span style={{ fontSize: "13px", color: "#f59e0b" }}>
                            ⚠ Switch to CreditCoin USC Testnet to interact with contracts
                        </span>
                        <button
                            onClick={ensureCorrectNetwork}
                            style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                padding: "6px 14px",
                                borderRadius: "8px",
                                background: "rgba(245,158,11,0.15)",
                                border: "1px solid rgba(245,158,11,0.4)",
                                color: "#f59e0b",
                                cursor: "pointer",
                            }}
                        >
                            Switch Network
                        </button>
                    </div>
                )}

                {networkError && (
                    <p style={{ fontSize: "12px", color: "#f87171" }}>{networkError}</p>
                )}

                {/* ── Deposit ── */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-medium text-white">Deposit cdUSD</h3>
                        <span className="text-xs text-[var(--color-muted)]">
                            Balance: ${formatUSDC(cdUSDBalance)}
                        </span>
                    </div>

                    {/* Input + Button */}
                    <div className="flex gap-3 mb-3">
                        <div className="flex-1 relative">
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => {
                                    setDepositAmount(e.target.value);
                                    if (depositStep !== "idle") resetDeposit();
                                }}
                                placeholder="0.00"
                                disabled={isInProgress}
                                className="w-full bg-[rgba(255,255,255,0.04)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[rgba(78,242,232,0.4)] disabled:opacity-50"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">
                                cdUSD
                            </span>
                        </div>
                        <button
                            onClick={handleDeposit}
                            disabled={!depositAmount || isInProgress}
                            className="px-6 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 whitespace-nowrap"
                            style={{
                                background: "rgba(78,242,232,0.12)",
                                border: "1px solid rgba(78,242,232,0.3)",
                                color: "#4ef2e8",
                            }}
                        >
                            {buttonLabel()}
                        </button>
                    </div>

                    {/* Two-step progress indicator */}
                    {isInProgress && (
                        <div className="flex items-center gap-3 mt-3 mb-2 p-3 rounded-xl bg-[rgba(78,242,232,0.04)] border border-[rgba(78,242,232,0.1)]">
                            {/* Step 1 */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full transition-colors ${approvePending
                                        ? "bg-[#4ef2e8] animate-pulse"
                                        : "bg-[#4ef2e8] opacity-40"
                                        }`}
                                />
                                <span
                                    className={`text-xs font-medium ${approvePending
                                        ? "text-[#4ef2e8]"
                                        : depositPending
                                            ? "text-[var(--color-muted)] line-through"
                                            : "text-[var(--color-muted)]"
                                        }`}
                                >
                                    {depositStep === "awaiting_approve"
                                        ? "Confirming approval…"
                                        : "1. Approve"}
                                </span>
                            </div>

                            {/* Arrow */}
                            <div className="flex-1 h-px bg-[var(--color-border)]" />

                            {/* Step 2 */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-2 h-2 rounded-full transition-colors ${depositPending
                                        ? "bg-[#4ef2e8] animate-pulse"
                                        : "bg-[rgba(255,255,255,0.15)]"
                                        }`}
                                />
                                <span
                                    className={`text-xs font-medium ${depositPending
                                        ? "text-[#4ef2e8]"
                                        : "text-[var(--color-muted)]"
                                        }`}
                                >
                                    {depositStep === "awaiting_deposit"
                                        ? "Confirming deposit…"
                                        : "2. Deposit"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Preview shares */}
                    {depositAmount && !isInProgress && depositStep === "idle" && (
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                            You receive ≈{" "}
                            <span className="text-white font-mono">
                                {previewSharesDisplay.toFixed(4)}
                            </span>{" "}
                            cvUSDC shares
                        </p>
                    )}

                    {/* % quick-fill buttons */}
                    {cdUSDBalance && cdUSDBalance > 0n && !isInProgress && (
                        <div className="flex gap-2 mt-3">
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        const amt =
                                            (parseFloat(
                                                formatUnits(cdUSDBalance, CDUSD_DECIMALS)
                                            ) *
                                                pct) /
                                            100;
                                        setDepositAmount(amt.toFixed(2));
                                        resetDeposit();
                                    }}
                                    className="text-xs px-3 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:text-white hover:border-[rgba(78,242,232,0.3)] transition-all"
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Success */}
                    {depositSuccess && (
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-green-400">
                                ✓ Deposited! Your cdUSD is now earning yield.
                            </p>
                            <button
                                onClick={() => {
                                    resetDeposit();
                                    setDepositAmount("");
                                    refetchCdUSDBalance();
                                    refetchAllowance();
                                }}
                                className="text-xs text-[var(--color-muted)] hover:text-white transition-colors underline"
                            >
                                Deposit more
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {depositStep === "error" && (
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-red-400">
                                ✗ {depositFlowError ?? "Transaction failed"}
                            </p>
                            <button
                                onClick={resetDeposit}
                                className="text-xs text-[var(--color-muted)] hover:text-white transition-colors underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Withdraw ── */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-medium text-white">
                            Withdraw & Claim Yield
                        </h3>
                        <span className="text-xs text-[var(--color-muted)]">
                            Max: {formatShares(maxRedeemable)} cvUSDC
                        </span>
                    </div>

                    <div className="flex gap-3 mb-3">
                        <div className="flex-1 relative">
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="0.0000"
                                className="w-full bg-[rgba(255,255,255,0.04)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white placeholder-[var(--color-muted)] text-sm focus:outline-none focus:border-[rgba(168,85,247,0.4)]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-muted)]">
                                cvUSDC
                            </span>
                        </div>
                        <button
                            onClick={handleWithdraw}
                            disabled={!withdrawAmount || withdrawPending || withdrawConfirming}
                            className="px-6 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                            style={{
                                background: "rgba(168,85,247,0.12)",
                                border: "1px solid rgba(168,85,247,0.3)",
                                color: "#a855f7",
                            }}
                        >
                            {withdrawPending
                                ? "Sign…"
                                : withdrawConfirming
                                    ? "Confirming…"
                                    : "Redeem"}
                        </button>
                    </div>

                    {withdrawAmount &&
                        previewAssets &&
                        previewAssets > 0n && (
                            <p className="text-xs text-[var(--color-muted)]">
                                You receive ≈{" "}
                                <span className="text-white font-mono">
                                    ${formatUSDC(previewAssets)}
                                </span>{" "}
                                cdUSD (includes accrued yield)
                            </p>
                        )}

                    <button
                        onClick={() =>
                            maxRedeemable &&
                            setWithdrawAmount(
                                formatUnits(maxRedeemable, SHARES_DECIMALS)
                            )
                        }
                        className="mt-2 text-xs text-[var(--color-muted)] hover:text-white transition-colors"
                    >
                        Redeem all shares →
                    </button>

                    {withdrawSuccess && (
                        <p className="mt-3 text-xs text-green-400">
                            ✓ Withdrawn! Yield claimed successfully.
                        </p>
                    )}
                </div>

                {/* ── How it works ── */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-6">
                    <h3 className="text-sm font-medium text-white mb-4">How it works</h3>
                    <div className="flex flex-col gap-3">
                        {[
                            { step: "1", text: "Deposit cdUSD → receive cvUSDC vault shares" },
                            { step: "2", text: "Borrowers pay 10% APR on their loans" },
                            { step: "3", text: "Interest accrues to vault, increasing share price" },
                            { step: "4", text: "Redeem cvUSDC shares → receive more cdUSD than deposited" },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-[rgba(78,242,232,0.1)] border border-[rgba(78,242,232,0.3)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] text-[var(--color-neon)]">
                                        {item.step}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--color-muted)]">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}