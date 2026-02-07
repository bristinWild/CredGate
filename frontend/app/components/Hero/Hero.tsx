import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
    return (
        <section className="px-12 pt-16 pb-24">
            <div className={styles.heroShell}>
                <div className={styles.heroGlow} />

                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    {/* Text */}
                    <div>
                        <h1 className={styles.heroTitle}>CredGate</h1>

                        <p className="mt-4 text-sm text-[var(--color-muted)] max-w-xl leading-relaxed " style={{
                            fontFamily:
                                "Georgia, 'Times New Roman', Times, serif",
                            letterSpacing: "0.1rem",
                        }}>
                            CredGate replaces over-collateralization with verifiable on-chain
                            reputation, using AI agents and Credion to generate a dynamic,
                            cross-chain credit score.
                        </p>

                        <button className={styles.ctaButton}>
                            Check Credit Score
                        </button>
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
        </section >
    );
}