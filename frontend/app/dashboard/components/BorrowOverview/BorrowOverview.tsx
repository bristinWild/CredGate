export default function BorrowOverview() {
    return (
        <div className="dashboardCard">
            <h3 className="text-sm mb-4">BORROW OVERVIEW</h3>

            <p className="text-3xl font-semibold">$3,100.00</p>
            <p className="text-xs text-[var(--color-muted)] mb-6">
                TOTAL BORROWED
            </p>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span>USDT: 500</span>
                    <span className="text-[var(--color-muted)]">Repay 10/25/24</span>
                </div>
                <div className="flex justify-between">
                    <span>DAI: 2,600</span>
                    <span className="text-[var(--color-muted)]">Repay 10/01/24</span>
                </div>
            </div>

            <button className="mt-6 rounded-full px-6 py-2 text-xs tracking-widest
        border border-pink-400 text-pink-400 hover:bg-[rgba(236,72,153,0.1)] transition">
                BORROW
            </button>
        </div>
    );
}
