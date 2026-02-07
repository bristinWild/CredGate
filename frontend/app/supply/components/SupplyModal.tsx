"use client";

export default function SupplyModal({
    asset,
    onClose,
}: {
    asset: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <div className="card w-[420px]">
                <h3 className="text-lg mb-4">Supply {asset}</h3>

                <input
                    placeholder="Amount"
                    className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 mb-4"
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="text-sm opacity-70">
                        Cancel
                    </button>
                    <button className="rounded-full px-5 py-2 bg-[var(--color-neon)] text-black">
                        Confirm Supply
                    </button>
                </div>
            </div>
        </div>
    );
}