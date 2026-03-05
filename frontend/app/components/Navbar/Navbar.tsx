"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect, useEnsName } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "CredLend", href: "/credlend" },
    { label: "Docs", href: "/docs" },

];

function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function WalletButton() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { openConnectModal } = useConnectModal();
    const { data: ensName } = useEnsName({ address });

    if (isConnected && address) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

                <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 16px", borderRadius: "999px",
                    border: "1px solid rgba(78,242,232,0.25)",
                    background: "rgba(78,242,232,0.06)",
                }}>
                    <div style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: "#4ef2e8",
                        boxShadow: "0 0 6px #4ef2e8",
                    }} />
                    <span style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.8)",
                        fontFamily: "monospace",
                        letterSpacing: "0.02em",
                    }}>
                        {ensName ?? shortAddress(address)}
                    </span>
                </div>


                <button
                    onClick={() => disconnect()}
                    style={{
                        padding: "8px 16px", borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "12px", cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
                    }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={openConnectModal}
            className="rounded-full border border-[var(--color-border)] px-6 py-2 text-sm text-[var(--color-neon)] transition-all hover:bg-[rgba(78,242,232,0.06)] hover:border-[rgba(78,242,232,0.4)]"
        >
            Connect Wallet
        </button>
    );
}

export default function Navbar() {
    const pathname = usePathname();

    return (
        <header className="flex items-center justify-between px-12 py-6">
            {/* Logo */}
            <Link href="/" className={styles.logoContainer}>
                <div className={styles.logoWrap}>
                    <div className={styles.logoGlow} />
                    <Image
                        src="/credgate-logo.png"
                        alt="CredGate"
                        width={56}
                        height={56}
                        className={styles.logo}
                        priority
                    />
                </div>
                <span className={styles.logoText} data-text="CredGate">
                    CredGate
                </span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex gap-12 text-sm">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`relative transition
                                ${isActive ? "text-white" : "text-[var(--color-muted)]"}
                                after:absolute after:left-0 after:-bottom-2 after:h-[1px]
                                after:bg-[var(--color-neon)] after:transition-all
                                ${isActive ? "after:w-full" : "after:w-0 hover:after:w-full"}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <WalletButton />
        </header>
    );
}