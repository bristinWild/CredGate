import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
    return (
        <header className="flex items-center justify-between px-12 py-6">
            <div className={styles.logoContainer}>
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

                <span
                    className={styles.logoText}
                    data-text="CredGate"
                >
                    CredGate
                </span>
            </div>

            <nav className="hidden md:flex gap-12 text-sm text-[var(--color-muted)]">
                {["Dashboard", "Supply Asset", "Borrow Asset", "Governance"].map(
                    (item) => (
                        <a
                            key={item}
                            className="relative hover:text-white transition after:absolute after:left-0 after:-bottom-2 after:h-[1px] after:w-0 after:bg-[var(--color-neon)] after:transition-all hover:after:w-full"
                        >
                            {item}
                        </a>
                    )
                )}
            </nav>


            <button className="rounded-full border border-[var(--color-border)] px-6 py-2 text-sm text-[var(--color-neon)] hover:bg-[rgba(78,242,232,0.08)] transition">
                Connect Wallet
            </button>
        </header>
    );
}