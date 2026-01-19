"use client";

import React, { useState } from "react";
import { Plus, Minus, Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveWaterLogAction } from "@/app/actions/nutrition";

interface WaterTrackerProps {
    current: number;
    target: number;
    onUpdate: () => void;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({ current, target, onUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const updateWater = async (amount: number) => {
        if (current + amount < 0) return;
        setIsUpdating(true);
        const res = await saveWaterLogAction(amount);
        if (res.success) {
            onUpdate();
        }
        setIsUpdating(false);
    };

    const percentage = Math.min(100, (current / target) * 100);

    return (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">Ingestão Hídrica</h3>
                </div>
                <div className="text-right">
                    <p className="text-xl font-black text-blue-500">{current.toFixed(1)}L</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Meta: {target}L</p>
                </div>
            </div>

            <div className="relative h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-6">
                <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />

                {/* Visual marker for subdivisions (optional) */}
                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                        <div key={m} className="w-[1px] h-full bg-black/5 dark:bg-white/5" />
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => updateWater(-0.25)}
                    disabled={isUpdating || current <= 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all text-zinc-600 dark:text-zinc-400 font-bold text-sm disabled:opacity-50"
                >
                    <Minus className="w-4 h-4" />
                    250ml
                </button>
                <button
                    onClick={() => updateWater(0.25)}
                    disabled={isUpdating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 transition-all text-white font-bold text-sm disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" />
                    250ml
                </button>
            </div>
        </div>
    );
};
