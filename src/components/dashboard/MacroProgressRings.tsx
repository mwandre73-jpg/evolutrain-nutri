"use client";

import React from "react";
import { motion } from "framer-motion";

interface MacroProgressRingsProps {
    proteins: { current: number; target: number };
    carbs: { current: number; target: number };
    fats: { current: number; target: number };
}

export const MacroProgressRings: React.FC<MacroProgressRingsProps> = ({ proteins, carbs, fats }) => {
    const rings = [
        { label: "PROTEÍNAS", current: proteins.current, target: proteins.target, color: "text-rose-500", rgba: "rgba(244, 63, 94, 0.2)", unit: "g" },
        { label: "CARBOS", current: carbs.current, target: carbs.target, color: "text-blue-500", rgba: "rgba(59, 130, 246, 0.2)", unit: "g" },
        { label: "GORDURAS", current: fats.current, target: fats.target, color: "text-amber-500", rgba: "rgba(245, 158, 11, 0.2)", unit: "g" },
    ];

    return (
        <div className="flex justify-around items-center gap-4 py-6">
            {rings.map((ring, i) => {
                const percentage = Math.min(100, (ring.current / ring.target) * 100);
                const radius = 36;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (percentage / 100) * circumference;

                return (
                    <div key={i} className="flex flex-col items-center">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            {/* Background Circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-zinc-100 dark:text-zinc-800"
                                />
                                {/* Progress Circle */}
                                <motion.circle
                                    cx="48"
                                    cy="48"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset: offset }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={ring.color}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-bold">{Math.round(percentage)}%</span>
                            </div>
                        </div>
                        <span className="mt-2 text-[10px] font-bold uppercase text-zinc-400">{ring.label}</span>
                        <p className="text-[11px] font-medium text-zinc-500">
                            {ring.current}{ring.unit}/{ring.target}{ring.unit}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};
