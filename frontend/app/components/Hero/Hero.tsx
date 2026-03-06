import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero() {
    return (
        <section className="px-12 pt-16 pb-24">
            <div className={styles.heroShell}>
                <div className={styles.heroGlow} />

                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <h1 className={styles.heroTitle}>CredGate</h1>

                        <p className="mt-6 max-w-lg" style={{
                            fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
                            fontSize: "1.05rem",
                            fontWeight: 600,
                            lineHeight: "1.85",
                            letterSpacing: "0.02em",
                            color: "rgba(255,255,255,0.55)",
                        }}>
                            The financial system is being rewritten on-chain. CredGate is the credit layer — turning wallet history into a verified identity that any protocol on any chain can trust.
                        </p>

                        <div className="flex flex-row items-center gap-6 mt-8">
                            <Link href="/dashboard">
                                <button className={styles.ctaButton}>
                                    Check Credit Score
                                </button>
                            </Link>

                            <Link
                                href="/docs"
                                className="flex items-center gap-1 text-sm text-white/40 hover:text-[#4ef2e8] transition-colors"
                                style={{ letterSpacing: "0.04rem", whiteSpace: "nowrap" }}
                            >
                                Read the docs <span style={{ fontSize: "16px", lineHeight: 1 }}>→</span>
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <Image
                            src="/credgate-hero.png"
                            alt="CredGate network"
                            width={520}
                            height={520}
                            className={styles.heroImage}
                            priority
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}