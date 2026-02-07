import Navbar from "@/app/components/Navbar/Navbar";
import SupplyAssetsCard from "@/app/supply/components/SupplyAssetsCard";
import YourSuppliedAssets from "@/app/supply/components/YourSuppliedAssets";
import RiskSimulation from "@/app/common/RiskSimulation";

export default function SupplyPage() {
    return (
        <>
            <Navbar />

            <main className="px-12 pb-24 space-y-10">

                <section className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-10 items-start lg:mt-12">
                    <SupplyAssetsCard />

                    <div className="lg:mt-2">
                        <YourSuppliedAssets />
                    </div>
                </section>

                <section className="flex items-center justify-between">
                    <RiskSimulation />

                    <button className="rounded-full px-10 py-3 text-sm tracking-widest uppercase
            text-black bg-[var(--color-neon)] hover:opacity-90 transition">
                        View Score
                    </button>
                </section>
            </main>
        </>
    );
}