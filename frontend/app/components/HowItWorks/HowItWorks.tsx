"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/components/HowItWorks/HowItWorks.module.css";

const STEPS = [
    {
        step: "01",
        tag: "YOUR HISTORY",
        title: "Your Wallet Speaks for Itself",
        description:
            "No bank. No credit check. No paperwork. CredGate looks at what you've actually done on-chain — how you've borrowed and repaid loans, how you hold and move stablecoins, how long your wallet has been active, and how you trade. Your history is your identity.",
        details: ["No KYC or signup", "Any EVM wallet works", "Public blockchain data only", "5 chains analyzed"],
        color: "#4ef2e8",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="4" y="8" width="28" height="20" rx="3" stroke="#4ef2e8" strokeWidth="1.5" />
                <path d="M4 14h28" stroke="#4ef2e8" strokeWidth="1.5" />
                <circle cx="10" cy="11" r="1.5" fill="#4ef2e8" />
                <circle cx="15" cy="11" r="1.5" fill="#4ef2e8" opacity="0.5" />
                <path d="M10 20h6M10 24h10" stroke="#4ef2e8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="27" cy="22" r="4" stroke="#4ef2e8" strokeWidth="1.5" />
                <path d="M25.5 22h3M27 20.5v3" stroke="#4ef2e8" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        step: "02",
        tag: "THE ANALYSIS",
        title: "We Score What Actually Matters",
        description:
            "CredGate looks at five things: did you repay your loans? do you hold stablecoins responsibly? are you active across multiple chains? do you trade meaningfully? how old is your wallet? Good behaviour adds points. Risky behaviour removes them. The result is a single score from 0 to 100.",
        details: ["Loan repayment history", "Stablecoin discipline", "Cross-chain activity", "Wallet age & consistency"],
        color: "#6ee7ff",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="7" stroke="#6ee7ff" strokeWidth="1.5" />
                <path d="M18 4v4M18 28v4M4 18h4M28 18h4" stroke="#6ee7ff" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M9.5 9.5l2.8 2.8M23.7 23.7l2.8 2.8M26.5 9.5l-2.8 2.8M12.3 23.7l-2.8 2.8" stroke="#6ee7ff" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="18" cy="18" r="2.5" fill="#6ee7ff" opacity="0.6" />
            </svg>
        ),
    },
    {
        step: "03",
        tag: "THE PROOF",
        title: "Your Score Gets Cryptographically Verified",
        description:
            "Anyone can claim a score. CredGate proves it. Using zero-knowledge cryptography, your score gets anchored to CreditCoin — a blockchain built specifically for credit. This means your score isn't just stored, it's mathematically proven to be correct. No one can fake it or alter it.",
        details: ["Zero-knowledge proof", "Tamper-proof on-chain record", "Takes 10–30 minutes", "Verified by CreditCoin"],
        color: "#7cf3d0",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M18 4l12 6v8c0 7-5 12-12 14C11 30 6 25 6 18v-8l12-6z" stroke="#7cf3d0" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M13 18l3 3 7-7" stroke="#7cf3d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        step: "04",
        tag: "YOUR SCORE",
        title: "A Credit Tier That Unlocks Real Benefits",
        description:
            "Once verified, you receive a credit tier based on your score. The better your history, the more you can borrow without putting up collateral. Think of it like a credit score in traditional finance — except it's transparent, trustless, and yours to use anywhere.",
        details: ["Score from 0 to 100", "5 tiers from PRIME to REJECT", "Higher score = bigger loan", "No collateral needed"],
        color: "#9fffd1",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M6 28l6-8 6 4 6-12 6 6" stroke="#9fffd1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="30" cy="18" r="2" fill="#9fffd1" />
                <path d="M6 32h24" stroke="#9fffd1" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
            </svg>
        ),
    },
    {
        step: "05",
        tag: "BORROW",
        title: "Borrow Without Collateral",
        description:
            "With a verified score, you can borrow cdUSD (CredGate's stablecoin) directly from the lending vault — no collateral required. The smart contract automatically checks your score and approves the exact amount you're eligible for. No middleman, no approval process, no waiting.",
        details: ["Instant loan decisions", "Smart contract enforced", "Borrow up to your credit limit", "Repay to build history"],
        color: "#4ef2e8",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="8" y="14" width="20" height="16" rx="3" stroke="#4ef2e8" strokeWidth="1.5" />
                <path d="M13 14v-3a5 5 0 0110 0v3" stroke="#4ef2e8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="18" cy="22" r="2.5" stroke="#4ef2e8" strokeWidth="1.5" />
                <path d="M18 24.5v2" stroke="#4ef2e8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        step: "06",
        tag: "FOR BUILDERS",
        title: "Any App Can Use Your Score",
        description:
            "Because your score lives on CreditCoin, any application on any blockchain can read it. Lending protocols, DAOs, NFT platforms — all can use CredGate to reward trustworthy wallets. If you're a developer, one API key is all you need to integrate credit scoring into your own app.",
        details: ["Score travels across chains", "Open to any protocol", "Developer SDK available", "Get your API key free"],
        color: "#4ef2e8",
        icon: (
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 12l-4 6 4 6" stroke="#4ef2e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M28 12l4 6-4 6" stroke="#4ef2e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 8l-6 20" stroke="#4ef2e8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
        ),
    },
];

function StepCard({ step: s, index }: { step: typeof STEPS[0]; index: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.15 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const isLeft = index % 2 === 0;

    return (
        <div
            ref={ref}
            className={styles.stepRow}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : `translateX(${isLeft ? "-40px" : "40px"})`,
                transition: `opacity 0.8s ease ${index * 0.1}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${index * 0.1}s`,
            }}
        >
            {/* Left side */}
            <div className={styles.cardSide} style={{ justifyContent: isLeft ? "flex-end" : "flex-start", gridColumn: isLeft ? 1 : 3 }}>
                {isLeft && (
                    <div className={styles.card} style={{ "--accent": s.color } as React.CSSProperties}>
                        <CardContent s={s} />
                    </div>
                )}
            </div>

            {/* Center axis */}
            <div className={styles.axisCol}>
                <div className={styles.nodeOuter} style={{ borderColor: s.color, boxShadow: `0 0 20px ${s.color}55` }}>
                    <div className={styles.nodeInner} style={{ background: s.color }} />
                </div>
            </div>

            {/* Right side */}
            <div className={styles.cardSide} style={{ justifyContent: isLeft ? "flex-start" : "flex-end", gridColumn: 3 }}>
                {!isLeft && (
                    <div className={styles.card} style={{ "--accent": s.color } as React.CSSProperties}>
                        <CardContent s={s} />
                    </div>
                )}
            </div>
        </div>
    );
}

function CardContent({ s }: { s: typeof STEPS[0] }) {
    return (
        <div className={styles.cardInner}>
            {/* Top row */}
            <div className={styles.cardTop}>
                <div className={styles.iconWrap} style={{ borderColor: `${s.color}30`, background: `${s.color}0d` }}>
                    {s.icon}
                </div>
                <div>
                    <span className={styles.tag} style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}0d` }}>
                        {s.tag}
                    </span>
                    <span className={styles.stepNum}>{s.step}</span>
                </div>
            </div>

            <h3 className={styles.title} style={{ color: s.color }}>{s.title}</h3>
            <p className={styles.description}>{s.description}</p>

            {/* Detail pills */}
            <div className={styles.pills}>
                {s.details.map((d) => (
                    <span key={d} className={styles.pill} style={{ borderColor: `${s.color}25`, color: `${s.color}99` }}>
                        {d}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function HowItWorks() {
    return (
        <section className={styles.section}>
            {/* Section header */}
            <div className={styles.header}>
                <div className={styles.headerBadge}>
                    <span className={styles.badgeDot} />
                    HOW IT WORKS
                </div>
                <h2 className={styles.heading}>How CredGate Works</h2>
                <p className={styles.subheading}>
                    Your on-chain history is your credit score. No banks, no paperwork — just what you've actually done on-chain.
                </p>
            </div>

            {/* Timeline */}
            <div className={styles.timeline}>
                {/* Vertical axis line */}
                <div className={styles.axisLine} />

                {STEPS.map((s, i) => (
                    <StepCard key={s.step} step={s} index={i} />
                ))}
            </div>
        </section>
    );
}