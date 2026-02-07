"use client";

import styles from "@/app/rwa/rwa.module.css";

export default function RWATokenizeCard() {
    return (
        <div className={styles.card}>
            <h3 className="text-sm tracking-widest text-white/90 mb-6">
                TOKENIZE REAL-WORLD ASSETS
            </h3>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <p className="text-3xl font-semibold">$5,880.50</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                        TOTAL TOKENIZED VALUE
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                        $122.30 YIELD GENERATED
                    </p>
                </div>

                <span className="text-xs text-[var(--color-muted)]">
                    ETUGOW APD
                </span>
            </div>


            <button
                className="mb-6 rounded-full px-6 py-2 text-xs tracking-widest
        text-black bg-[var(--color-neon)] hover:opacity-90 transition"
            >
                MINT RWA NFT
            </button>


            <div className="grid grid-cols-3 gap-6 text-xs text-[var(--color-muted)] mb-6">
                <div className="flex items-center gap-2">
                    <span>🏦</span> Bonds
                </div>
                <div className="flex items-center gap-2">
                    <span>🏠</span> Real Estate
                </div>
                <div className="flex items-center gap-2">
                    <span>📜</span> IP Rights
                </div>
            </div>

            <div className="h-px bg-white/10 mb-4" />


            <p className="text-xs text-[var(--color-muted)]">
                TOTAL VALUE TOKENIZED:
                <span className="text-white ml-2">$550M+</span>
            </p>
        </div>
    );
}