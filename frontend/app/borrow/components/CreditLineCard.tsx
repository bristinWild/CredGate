import styles from "@/app/borrow/Borrow.module.css"

export default function CreditLineCard() {
    return (
        <div className={styles.card}>
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm tracking-widest">
                    CREDIT LINE AVAILABLE
                </h4>

                <span className="text-lg font-semibold text-[var(--color-neon)]">
                    $2,500.00
                </span>
            </div>

            <div className="h-2 rounded bg-white/10 overflow-hidden">
                <div
                    className="h-full bg-[var(--color-neon)]"
                    style={{ width: "62%" }}
                />
            </div>

            <p className="text-xs text-[var(--color-muted)] mt-3">
                Based on current collateral & credit score
            </p>
        </div>
    );
}