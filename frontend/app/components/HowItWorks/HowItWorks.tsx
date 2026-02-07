"use client";

import StepCard from "@/app/components/HowItWorks/StepCard";
import styles from "@/app/components/HowItWorks/HowItWorks.module.css";
import StepReveal from "@/app/components/HowItWorks/StepReveal";

export default function HowItWorks() {
    return (
        <section className="px-12 py-32">

          <div className="mb-32 max-w-3xl mx-auto text-center">
                    <h2
                        className="text-4xl font-semibold tracking-wide
                                bg-gradient-to-r from-[#4EF2E8] via-[#6EE7FF] to-[#4EF2E8]
                                bg-clip-text text-transparent"style={{
                                fontFamily: "'Copperplate', sans-serif",
                            letterSpacing: "0.1rem",
                        }}
                    >
                        How CredGate Works?
                    </h2>
            </div>


          <div className={styles.timeline}>
            <div className={styles.axis} />
                    <StepCard
                        step="01"
                        title="CredTools Data"
                        description="Ingests raw cross-chain events."
                        icon="🔍"
                        align="left"
                    />

                    <StepCard
                        step="02"
                        title="CredSource Signal"
                        description="AI analyses repayment, liquidation history, and governance behavior."
                        icon="🧠"
                        align="right"
                    />

                    <StepCard
                        step="04"
                        title="Dynamic Credit Score"
                        description="Score engine (0–100%) adjusts in real time based on behavior."
                        icon="📊"
                        align="left"
                    />

                    <StepCard
                        step="05"
                        title="RWA Integration"
                        description="Tokenize real-world assets to boost your score (oracle-backed)."
                        icon="🏦"
                        align="right"
                    />

                    <StepCard
                        step="06"
                        title="Launch CredGate App"
                        description="Start borrowing instantly using your dynamic credit score."
                        icon="🚀"
                        align="left"
                    />
                </div>
        </section>
    );
}