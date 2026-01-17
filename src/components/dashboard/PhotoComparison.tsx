"use client";

import React, { useState } from "react";

interface PhotoComparisonProps {
    beforeUrl: string;
    afterUrl: string;
    beforeLabel?: string;
    afterLabel?: string;
}

export default function PhotoComparison({
    beforeUrl,
    afterUrl,
    beforeLabel = "Antes",
    afterLabel = "Depois"
}: PhotoComparisonProps) {
    const [sliderPos, setSliderPos] = useState(50);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(position);
    };

    return (
        <div
            className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden cursor-col-resize select-none ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-2xl"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
        >
            {/* After Image (Background) */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${afterUrl})` }}
            />

            {/* Before Image (Clip) */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url(${beforeUrl})`,
                    clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
                }}
            />

            {/* Slider Line */}
            <div
                className="absolute inset-y-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.3)] z-10"
                style={{ left: `${sliderPos}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="flex gap-1">
                        <div className="w-0.5 h-3 bg-zinc-300 rounded-full" />
                        <div className="w-0.5 h-3 bg-zinc-300 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wider">
                {beforeLabel}
            </div>
            <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-brand-primary/80 backdrop-blur-md rounded-lg text-[10px] font-bold text-black uppercase tracking-wider">
                {afterLabel}
            </div>
        </div>
    );
}
