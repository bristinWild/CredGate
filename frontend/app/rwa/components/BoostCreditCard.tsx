import styles from "@/app/rwa/rwa.module.css";

const STEPS = [
    "Connect Wallet & Verify RWA",
    "Mint RWA-backed NFT",
    "Allocate RWA as Collateral",
    "Increase RWA Credit Score",
    "Unlock Lower Interest Rates",
];

export default function BoostCreditCard() {
    return (
        <div className={styles.card}>
            <h3 className="text-sm tracking-widest text-white/90 mb-6">
                BOOST YOUR CREDIT SCORE
            </h3>

            <div className="mb-6">
                <p className="text-3xl font-semibold">$2,110.00</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                    RWA-ALIGNED BALANCE
                </p>
            </div>

            <div className="divide-y divide-white/5">
                {STEPS.map((step, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 py-3 text-sm text-white/80"
                    >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center
              text-xs border border-white/20">
                            {i + 1}
                        </span>
                        {step}
                    </div>
                ))}
            </div>
        </div>
    );
}