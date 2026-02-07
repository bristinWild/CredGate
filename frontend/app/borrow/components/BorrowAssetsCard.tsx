"use client";

import styles from "@/app/borrow/Borrow.module.css"

const ASSETS = [
    { symbol: "USDT", apy: 0.0123 },
    { symbol: "CTC", apy: 0.0206 },
];

export default function BorrowAssetsCard() {
    return (
        <div className={styles.card}>

            <h3 className="text-sm tracking-widest text-white/90 mb-6">
                BORROW ASSETS
            </h3>


            <div className="flex items-start justify-between mb-6">
                <div>
                    <p className="text-3xl font-semibold">$5,880.50</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                        TOTAL BORROWED
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                        $122.30 INTEREST ACCRUED
                    </p>
                </div>

                <span className="text-xs text-[var(--color-muted)]">
                    ETUBOW APD
                </span>
            </div>

            <div className="h-px bg-white/10 mb-4" />


            <div className="grid grid-cols-3 text-xs text-[var(--color-muted)] mb-3">
                <span>ASSET</span>
                <span className="text-center">AVAILABLE</span>
                <span className="text-right">BORROW APY</span>
            </div>


            <div className="divide-y divide-white/5">
                {ASSETS.map((asset) => (
                    <div
                        key={asset.symbol}
                        className="grid grid-cols-3 items-center py-3 text-sm
              cursor-pointer hover:bg-white/5 transition"
                    >
                        <span className="font-medium">{asset.symbol}</span>

                        <span className="text-center text-[var(--color-muted)]">
                            —
                        </span>

                        <span className="text-right text-pink-400">
                            {(asset.apy * 100).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-6">
                <button className="rounded-full px-6 py-2 text-xs tracking-widest
          border border-pink-400 text-pink-400 hover:bg-pink-400/10 transition">
                    BORROW
                </button>
            </div>
        </div>
    );
}