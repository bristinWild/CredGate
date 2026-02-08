"use client";

export default function Footer() {
    return (
        <footer className="relative pt-1 pb-1 mt-30 border-t border-white/10">

            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#4EF2E8]/40 to-transparent" />

            <div className="max-w-7xl mx-auto px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">

                <div>
                    <h3
                        className="text-xl tracking-widest bg-gradient-to-r 
                                   from-[#4EF2E8] via-[#6EE7FF] to-[#4EF2E8]
                                   bg-clip-text text-transparent"
                        style={{ fontFamily: "'Copperplate', sans-serif" }}
                    >
                        CREDGATE
                    </h3>

                    <p className="mt-4 text-[var(--color-muted)] leading-relaxed max-w-xs">
                        A decentralized credit layer powered by AI agents,
                        on-chain reputation, and real-world assets.
                    </p>
                </div>

                <div className="flex flex-col gap-3 md:items-center">
                    <a className="hover:text-[#4EF2E8] transition" href="#">
                        Dashboard
                    </a>
                    <a className="hover:text-[#4EF2E8] transition" href="#">
                        Supply
                    </a>
                    <a className="hover:text-[#4EF2E8] transition" href="#">
                        Borrow
                    </a>
                    <a className="hover:text-[#4EF2E8] transition" href="#">
                        RWA
                    </a>
                    <a className="hover:text-[#4EF2E8] transition" href="#">
                        Governance
                    </a>
                </div>

                <div className="flex flex-col gap-4 md:items-end">
                    <div className="flex gap-4 text-lg">
                        <a className="hover:text-[#4EF2E8] transition" href="#">
                            𝕏
                        </a>
                        <a className="hover:text-[#4EF2E8] transition" href="#">
                            GitHub
                        </a>
                        <a className="hover:text-[#4EF2E8] transition" href="#">
                            Discord
                        </a>
                    </div>

                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} CredGate. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}