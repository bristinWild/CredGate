"use client";

export default function Footer() {
    return (
        <footer className="relative pt-1 pb-1 mt-30 border-t border-white/10">

            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#4EF2E8]/40 to-transparent" />

            <div className="max-w-7xl mx-auto px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">

                {/* Brand */}
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
                        The credit layer Web3 has been missing. Your wallet history becomes a verified identity.
                        Trusted by any chain, any protocol, any app.
                    </p>
                </div>

                {/* Nav grid */}
                <div className="md:flex md:justify-center">
                    <div>
                        <p className="text-xs tracking-widest text-white/30 mb-4 uppercase">Protocol</p>
                        <div className="grid grid-cols-2 gap-x-10 gap-y-3">

                            {/* Live links */}
                            <a className="text-white/60 hover:text-[#4EF2E8] transition-colors" href="/dashboard">
                                Dashboard
                            </a>
                            <a className="text-white/60 hover:text-[#4EF2E8] transition-colors" href="/credlend">
                                Supply
                            </a>
                            <a className="text-white/60 hover:text-[#4EF2E8] transition-colors" href="/credlend">
                                Borrow
                            </a>
                            <a className="text-white/60 hover:text-[#4EF2E8] transition-colors" href="/keys">
                                API Key
                            </a>

                            {/* Coming soon */}
                            <span className="flex items-center gap-2 text-white/30 cursor-default select-none">
                                RWA
                                <span style={{
                                    fontSize: "9px",
                                    letterSpacing: "0.08em",
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                    border: "1px solid rgba(78,242,232,0.2)",
                                    color: "rgba(78,242,232,0.5)",
                                    background: "rgba(78,242,232,0.05)",
                                    whiteSpace: "nowrap",
                                }}>
                                    SOON
                                </span>
                            </span>

                            <span className="flex items-center gap-2 text-white/30 cursor-default select-none">
                                Governance
                                <span style={{
                                    fontSize: "9px",
                                    letterSpacing: "0.08em",
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                    border: "1px solid rgba(78,242,232,0.2)",
                                    color: "rgba(78,242,232,0.5)",
                                    background: "rgba(78,242,232,0.05)",
                                    whiteSpace: "nowrap",
                                }}>
                                    SOON
                                </span>
                            </span>

                        </div>
                    </div>
                </div>

                {/* Social + copyright */}
                <div className="flex flex-col gap-4 md:items-end">
                    <div className="flex gap-4 text-lg">
                        <a className="text-white/50 hover:text-[#4EF2E8] transition-colors" href="#">𝕏</a>
                        <a className="text-white/50 hover:text-[#4EF2E8] transition-colors" href="#">GitHub</a>
                        <a className="text-white/50 hover:text-[#4EF2E8] transition-colors" href="#">Discord</a>
                    </div>

                    <p className="text-xs text-white/40">
                        © {new Date().getFullYear()} CredGate. All rights reserved.
                    </p>
                </div>

            </div>
        </footer>
    );
}