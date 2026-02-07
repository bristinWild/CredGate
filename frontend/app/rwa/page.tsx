import Navbar from "@/app/components/Navbar/Navbar";
import RWATokenizeCard from "./components/RWATokenizeCard";
import BoostCreditCard from "./components/BoostCreditCard";
import CreditLineCard from "@/app/borrow/components/CreditLineCard";
import RiskSimulation from "@/app/common/RiskSimulation";

export default function RWAPage() {
    return (
        <>
            <Navbar />

            <main className="px-12 pb-24 space-y-10">

                <section className="mt-10 grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-10 items-start">
                    <RWATokenizeCard />
                    <BoostCreditCard />
                </section>


                <section>
                    <CreditLineCard />
                </section>


                <section className="flex items-center justify-between">
                    <RiskSimulation />

                    <button className="rounded-full px-10 py-3 text-sm tracking-widest uppercase
            text-black bg-[var(--color-neon)] hover:opacity-90 transition">
                        Launch App
                    </button>
                </section>
            </main>
        </>
    );
}