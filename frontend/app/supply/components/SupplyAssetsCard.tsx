"use client";

import { useState } from "react";
import SupplyModal from "@/app/supply/components/SupplyModal";
import styles from "../Supply.module.css"

const ASSETS = [
    {
        symbol: "USDT",
        apy: 0.0321,
        balance: "1,250.00",
    },
    {
        symbol: "CTC",
        apy: 0.0615,
        balance: "8,400.00",
    },
];

export default function SupplyAssetsCard() {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <>
            <div className={styles.card}>

                <h3 className="text-sm tracking-widest text-white/90 mb-6">
                    SUPPLY ASSETS TO EARN
                </h3>


                <div className="flex items-start justify-between mb-6">
                    <div>
                        <p className="text-3xl font-semibold">$5,820.00</p>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                            TOTAL SUPPLIED
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                            $122.30 INTEREST EARNED
                        </p>
                    </div>

                    <span className="text-xs text-[var(--color-muted)]">
                        ETUGOW APD
                    </span>
                </div>


                <div className="h-px bg-white/10 mb-4" />


                <div className="grid grid-cols-3 text-xs text-[var(--color-muted)] mb-3">
                    <span>ASSET</span>
                    <span className="text-center">WALLET BALANCE</span>
                    <span className="text-right">APY</span>
                </div>

                <div className="divide-y divide-white/5">
                    {ASSETS.map((asset) => (
                        <div
                            key={asset.symbol}
                            onClick={() => setSelected(asset.symbol)}
                            className="grid grid-cols-3 items-center py-3 text-sm
                cursor-pointer rounded-md
                hover:bg-white/5 transition"
                        >

                            <span className="font-medium">
                                {asset.symbol}
                            </span>


                            <span className="text-center text-[var(--color-muted)]">
                                {asset.balance}
                            </span>

                            <span className="text-right text-[var(--color-neon)]">
                                {(asset.apy * 100).toFixed(2)}%
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        className="rounded-full px-6 py-2 text-xs tracking-widest
              border border-[rgba(78,242,232,0.4)]
              text-[var(--color-neon)]
              hover:bg-[rgba(78,242,232,0.08)]
              transition"
                    >
                        SUPPLY
                    </button>
                </div>
            </div>

            {selected && (
                <SupplyModal
                    asset={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </>
    );
}