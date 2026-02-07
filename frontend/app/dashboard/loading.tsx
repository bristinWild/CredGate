export default function DashboardLoading() {
    return (
        <main className="px-12 pb-24 space-y-10 animate-pulse">
            <div className="grid grid-cols-[2.2fr_1fr] gap-10">
                <div className="h-[260px] rounded-xl bg-white/5" />
                <div className="h-[260px] rounded-xl bg-white/5" />
            </div>

            <div className="grid grid-cols-2 gap-10">
                <div className="h-[220px] rounded-xl bg-white/5" />
                <div className="h-[220px] rounded-xl bg-white/5" />
            </div>

            <div className="h-[100px] w-[340px] rounded-xl bg-white/5" />
        </main>
    );
}