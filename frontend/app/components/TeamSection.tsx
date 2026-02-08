"use client";

import Image from "next/image";

const TEAM = [
    {
        name: "Subhasish",
        role: "Co-founder & CEO",
        image: "/pfp2.png",
    },
    {
        name: "Bristin",
        role: "Co-founder & CPO",
        image: "/pfp1.png",
    },

];

export default function TeamSection() {
    return (
        <section className="relative px-12 py-12">

            <div className="text-center mb-20">
                <h2
                    className="text-4xl font-semibold tracking-wide
                               bg-gradient-to-r from-[#4EF2E8] via-[#6EE7FF] to-[#4EF2E8]
                               bg-clip-text text-transparent"
                    style={{
                        fontFamily: "'Copperplate', sans-serif",
                        letterSpacing: "0.12rem",
                    }}
                >
                    Core Team
                </h2>

                <p className="mt-4 text-sm text-[var(--color-muted)]">
                    Building the next generation of on-chain credit.
                </p>
            </div>


            <div className="flex flex-col md:flex-row items-center justify-center gap-16">
                {TEAM.map((member) => (
                    <div
                        key={member.name}
                        className="group flex flex-col items-center text-center"
                    >

                        <div
                            className="relative w-40 h-40 rounded-full p-[2px]
                                       bg-gradient-to-br from-[#4EF2E8]/80 to-[#6EE7FF]/30
                                       group-hover:from-[#6EE7FF] group-hover:to-[#4EF2E8]
                                       transition"
                        >
                            <div
                                className="w-full h-full rounded-full overflow-hidden bg-black
                                     flex items-center justify-center"
                            >
                                <div
                                    className="absolute inset-4 rounded-full
               shadow-[inset_0_0_20px_rgba(78,242,232,0.25)]
               pointer-events-none"
                                />
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    width={320}
                                    height={320}
                                    className="object-cover scale-110"
                                    priority
                                />
                            </div>


                            <div
                                className="absolute inset-0 rounded-full opacity-0
                                           group-hover:opacity-100 transition
                                           shadow-[0_0_40px_rgba(78,242,232,0.6)]"
                            />
                        </div>


                        <h3 className="mt-6 text-lg text-white tracking-wide">
                            {member.name}
                        </h3>

                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {member.role}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}