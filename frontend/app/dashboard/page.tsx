import Navbar from "@/app/components/Navbar/Navbar";
import ActivityChart from "@/app/dashboard/components/ActivityChart/ActivityChart";
import CreditScoreRing from "@/app/dashboard/components/CreditScoreRing/CreditScoreRing";
import SupplyOverview from "@/app/dashboard/components/SupplyOverview/SupplyOverview";
import BorrowOverview from "@/app/dashboard/components/BorrowOverview/BorrowOverview";
import RiskSimulation from "@/app/common/RiskSimulation";

export default function DashboardPage() {
    return (<> <Navbar /> <main className="px-12 pb-24 space-y-10" > {
    }

        <section className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-10" > <ActivityChart /> <CreditScoreRing /> </section> {
        }

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10" > <SupplyOverview /> <BorrowOverview /> </section> {
        }

        <section className="flex items-center justify-between" > <RiskSimulation /> <button className="rounded-full px-10 py-3 text-sm tracking-widest uppercase
 text-black bg-[var(--color-neon)] hover:opacity-90 transition">
            Check Score </button> </section> </main> </>);
}