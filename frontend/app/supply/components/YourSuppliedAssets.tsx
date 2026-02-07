"use client";

import styles from "../Supply.module.css"

const SUPPLIED_ASSETS = [
    { symbol: "USDT", balance: "1,450.00", allocation: 46 },
    { symbol: "CTC", balance: "1,660.00", allocation: 54 },
];

export default function YourSuppliedAssets() {
    return (
        <div className={`${styles.card} ${styles.secondary}`}>

            < h3 className="text-sm tracking-widest text-white/90 mb-6 lg:mt-0" >
                YOUR SUPPLIED ASSETS
            </h3 >


            < div className="mb-6" >
                <p className="text-3xl font-semibold">$3,110.00</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                    TOTAL SUPPLIED BALANCE
                </p>
            </div >


            < div className="h-px bg-white/10 mb-4" />


            < div className="grid grid-cols-3 text-xs text-[var(--color-muted)] mb-3" >
                <span>ASSET</span>
                <span className="text-center">BALANCE</span>
                <span className="text-right">ALLOCATION</span>
            </div >


            < div className="divide-y divide-white/5" >
                {
                    SUPPLIED_ASSETS.map((asset) => (
                        <div
                            key={asset.symbol}
                            className="grid grid-cols-3 items-center py-3 text-sm"
                        >
                            <span className="font-medium">{asset.symbol}</span>

                            <span className="text-center text-[var(--color-muted)]">
                                {asset.balance}
                            </span>

                            <div className="flex justify-end items-center gap-2">
                                <span className="text-[var(--color-neon)] text-xs">
                                    {asset.allocation}%
                                </span>
                                <div className="w-16 h-1 rounded bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full bg-[var(--color-neon)]"
                                        style={{ width: `${asset.allocation}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div >


            < div className="flex justify-between mt-6" >
                <button
                    className="rounded-full px-4 py-2 text-xs tracking-widest
            border border-white/20 text-white/70
            hover:bg-white/5 transition"
                >
                    WITHDRAW
                </button>

                <button
                    className="rounded-full px-4 py-2 text-xs tracking-widest
            border border-pink-400 text-pink-400
            hover:bg-pink-400/10 transition"
                >
                    BORROW
                </button>
            </div >
        </div >

    );
}