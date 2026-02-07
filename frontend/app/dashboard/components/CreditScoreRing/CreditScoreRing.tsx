const SCORE = 825;
const MAX = 1000;
const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OFFSET = CIRCUMFERENCE - (SCORE / MAX) * CIRCUMFERENCE;

export default function CreditScoreRing() {
    return (
        <div className="dashboardCard flex flex-col items-center">
            <p className="text-xs mb-4 text-[var(--color-muted)]">
                CROSS-CHAIN CREDIT SCORE
            </p>

            <svg width="180" height="180">
                <circle
                    cx="90"
                    cy="90"
                    r={RADIUS}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="10"
                    fill="none"
                />

                <circle
                    cx="90"
                    cy="90"
                    r={RADIUS}
                    stroke="url(#grad)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={OFFSET}
                    strokeLinecap="round"
                    style={{
                        transition: "stroke-dashoffset 1.2s ease",
                    }}
                />

                <defs>
                    <linearGradient id="grad">
                        <stop offset="0%" stopColor="#4ef2e8" />
                        <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                </defs>

                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dy=".3em"
                    className="fill-white text-3xl font-semibold"
                >
                    {SCORE}
                </text>
            </svg>

            <div className="flex gap-6 mt-4 text-xs">
                <span className="text-[var(--color-neon)]">RWA 410</span>
                <span className="text-pink-400">Onchain 415</span>
            </div>
        </div>
    );
}
