import styles from "../../Dashboard.module.css";

export default function ActivityChart() {
    return (
        <div className="dashboardCard">
            <h3 className="text-sm mb-4">
                USER WALLET ACTIVITY ACROSS CHAINS
            </h3>

            <svg viewBox="0 0 400 160" className="w-full h-[220px]">

                {[...Array(6)].map((_, i) => (
                    <line
                        key={i}
                        x1="0"
                        y1={i * 30}
                        x2="400"
                        y2={i * 30}
                        stroke="rgba(255,255,255,0.05)"
                    />
                ))}


                <path
                    d="M0 120 L40 110 L80 90 L120 100 L160 70 L200 80 L240 60 L280 65 L320 40 L360 45 L400 30 L400 160 L0 160 Z"
                    fill="rgba(78,242,232,0.18)"
                />


                <path
                    d="M0 120 L40 110 L80 90 L120 100 L160 70 L200 80 L240 60 L280 65 L320 40 L360 45 L400 30"
                    fill="none"
                    stroke="rgba(78,242,232,0.9)"
                    strokeWidth="2"
                    className={styles.activityLine}
                />
            </svg>
        </div>
    );
}