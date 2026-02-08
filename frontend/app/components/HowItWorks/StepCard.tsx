"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "@/app/components/HowItWorks/HowItWorks.module.css";

interface StepCardProps {
    step: string;
    title: string;
    description: string;
    iconSrc: string;
    align?: "left" | "right";
}

export default function StepCard({
    step,
    title,
    description,
    iconSrc,
    align = "left",
}: StepCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.25 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`${styles.stepWrapper} ${styles[align]} ${visible ? styles.visible : ""
                }`}
        >
            <div className={styles.card} data-step={step}>
                <div className={styles.cardInner}>
                    <div className={styles.icon}>
                        <Image
                            src={iconSrc}
                            alt={title}
                            fill
                            sizes="72px"
                            style={{ objectFit: "contain" }}
                        />
                    </div>
                    <h3 className={styles.title}>{title}</h3>
                    <p className={styles.description}>{description}</p>
                    <span className={styles.step}>{step}</span>
                </div>
            </div>

            <div className={styles.connector}>
                <span className={styles.node} />
            </div>
        </div>
    );
}