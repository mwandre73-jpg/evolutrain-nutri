"use client";

import React from "react";

export default function DietasPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                    Planos <span className="text-gradient">Alimentares</span>
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                    Criação e gestão de dietas individualizadas.
                </p>
            </div>

            <div className="flex h-96 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-center">
                    <p className="text-4xl">🍱</p>
                    <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-white">Módulo em Desenvolvimento</h2>
                    <p className="mt-2 text-zinc-500">A ferramenta de prescrição dietética será liberada em breve.</p>
                </div>
            </div>
        </div>
    );
}
