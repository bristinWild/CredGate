"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Supply Asset", href: "/supply" },
    { label: "Borrow Asset", href: "/borrow" },
    { label: "RWA", href: "/rwa" },
];

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
                after:bg-[var(--color-neon)]
                after:transition-all
                ${isActive ? "after:w-full" : "after:w-0 hover:after:w-full"}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <button className="rounded-full border border-[var(--color-border)] px-6 py-2 text-sm text-[var(--color-neon)]">
                Connect Wallet
            </button>
        </header>
    );
}