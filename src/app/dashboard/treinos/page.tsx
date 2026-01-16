"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getStudentWorkoutsAction } from "@/app/actions/athletes";

export default function TreinosPage() {
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStudentWorkoutsAction().then(data => {
            setWorkouts(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Carregando seus treinos...</div>;
    }

    return (
        <div className="space-y-8 animate-slide-up">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                    Meus <span className="text-gradient">Treinos</span>
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Sua rotina de treinos personalizada para atingir seus objetivos.
                </p>
            </header>

            {workouts.length > 0 ? (
                <div className="grid gap-4">
                    {workouts.map((workout) => (
                        <Link
                            key={workout.id}
                            href={`/dashboard/planilhas/${workout.id}`}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:ring-brand-primary dark:bg-zinc-900 dark:ring-zinc-800"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-transform group-hover:scale-110 ${workout.completed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-zinc-100 dark:bg-zinc-800'
                                    }`}>
                                    {workout.type === 'Corrida' ? '🏃‍♂️' :
                                        workout.type === 'Musculação' ? '🏋️‍♂️' : '⚡'}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-zinc-900 dark:text-white">{workout.type}</h3>
                                        <span className="text-xs font-medium text-zinc-400">{workout.date}</span>
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-md">
                                        {workout.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 self-end sm:self-center">
                                {workout.completed ? (
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/30">
                                        Concluído
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-900/30">
                                        Pendente
                                    </span>
                                )}
                                <span className="text-zinc-300 transition-transform group-hover:translate-x-1">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-4xl text-zinc-400">
                            ⚡
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Seu cronograma está vazio</h2>
                        <p className="mt-2 max-w-sm text-zinc-500">
                            Fale com seu treinador para começar sua jornada!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
