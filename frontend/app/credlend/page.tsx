"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar/Navbar";
import BorrowTab from "@/app/credlend/BorrowTab";
import LendTab from "@/app/credlend/LendTab";

export default function CredLendPage() {
    const [activeTab, setActiveTab] = useState<"borrow" | "lend">("borrow");

    return (
        <div className="min-h-screen bg-[var(--color-bg)] text-white">
            <Navbar />

            {/* Hero */}
            <div className="px-12 pt-10 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-neon)] shadow-[0_0_8px_var(--color-neon)]" />
                    <span className="text-xs text-[var(--color-muted)] tracking-[0.2em] uppercase">
                        Undercollateralized Lending
                    </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-1">
                    Cred<span className="text-[var(--color-neon)]">Lend</span>
                </h1>
                <p className="text-[var(--color-muted)] text-sm max-w-lg">
                    Borrow against your on-chain credit score. No collateral needed — your behaviour is your credit.
                </p>
            </div>

            {/* Tabs */}
            <div className="px-12 mb-8">
                <div className="flex gap-1 p-1 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] w-fit">
                    {(["borrow", "lend"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${activeTab === tab
                                ? "bg-[var(--color-neon)] text-[#0a0e14] shadow-[0_0_16px_rgba(78,242,232,0.3)]"
                                : "text-[var(--color-muted)] hover:text-white"
                                }`}
                        >
                            {tab === "borrow" ? "Borrow" : "Lend & Earn"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-12 pb-16">
                {activeTab === "borrow" ? <BorrowTab /> : <LendTab />}
            </div>
        </div>
    );
}