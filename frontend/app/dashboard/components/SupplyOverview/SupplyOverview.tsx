export default function SupplyOverview() {
    return (
        <div className="dashboardCard">
            <h3 className="text-sm mb-4">SUPPLY OVERVIEW</h3>

            <p className="text-3xl font-semibold">$5,820.50</p>
            <p className="text-xs text-[var(--color-muted)] mb-6">
                TOTAL SUPPLIED • $123.30 INTEREST EARNED
            </p>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span>ETH: 3.5</span>
                    <span className="text-[var(--color-muted)]">APY 3.1%</span>
                </div>
                <div className="flex justify-between">
                    <span>USDC: 1,200</span>
                    <span className="text-[var(--color-muted)]">APY 2.8%</span>
                </div>
            </div>

            <button className="mt-6 rounded-full px-6 py-2 text-xs tracking-widest
        border border-[rgba(78,242,232,0.4)]
        text-[var(--color-neon)] hover:bg-[rgba(78,242,232,0.08)] transition">
                SUPPLY
            </button>
        </div>
    );
}