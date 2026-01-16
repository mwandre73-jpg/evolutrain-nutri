"use client";

import React, { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { getAthleteEvolutionAction } from "@/app/actions/athletes";

export default function EvolucaoPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAthleteEvolutionAction().then(res => {
            setData(res);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center text-zinc-500">
                Carregando sua evolução...
            </div>
        );
    }

    const hasData = data && data.vo2History.length > 0;

    return (
        <div className="space-y-8 animate-slide-up">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                    Minha <span className="text-gradient">Evolução</span>
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Acompanhe seu progresso físico e performance nas pistas.
                </p>
            </header>

            {!hasData ? (
                <div className="rounded-3xl bg-white p-12 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-50 text-4xl dark:bg-zinc-800">
                        📈
                    </div>
                    <h2 className="text-2xl font-bold">Sem dados suficientes</h2>
                    <p className="mt-2 text-zinc-500">
                        Realize mais testes aeróbicos para visualizar seu gráfico de evolução.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid gap-8 lg:grid-cols-2">
                        {/* VO2 Max Chart */}
                        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold">Progressão VO2 Máx</h3>
                                <div className="rounded-xl bg-brand-primary/10 px-3 py-1 text-xs font-bold text-brand-primary">
                                    AERÓBICO
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.vo2History}>
                                        <defs>
                                            <linearGradient id="colorVo2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                                            domain={['dataMin - 5', 'dataMax + 5']}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="vo2"
                                            name="VO2 Máx"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorVo2)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Vmax Evolution */}
                        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold">Velocidade Máxima (Vmax)</h3>
                                <div className="rounded-xl bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-500">
                                    KM/H
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.vo2History}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="vmax"
                                            name="Vmax (km/h)"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 8 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Race Times Table */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                        <h3 className="mb-6 text-lg font-bold">Meus Tempos e Recordes</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                                        <th className="pb-4 text-sm font-bold text-zinc-400">Data</th>
                                        <th className="pb-4 text-sm font-bold text-zinc-400">Tipo de Teste</th>
                                        <th className="pb-4 text-sm font-bold text-zinc-400">Resultado</th>
                                        <th className="pb-4 text-sm font-bold text-zinc-400">Vmax Calc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.raceTimes.map((race: any, i: number) => (
                                        <tr key={i} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50">
                                            <td className="py-4 text-sm">{race.date}</td>
                                            <td className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{race.testType}</span>
                                                    {race.exercise && <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{race.exercise}</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm font-bold">
                                                {race.category === 'STRENGTH'
                                                    ? `${race.result} kg`
                                                    : (race.category === 'RACE'
                                                        ? (
                                                            <div className="flex flex-col">
                                                                {race.distance && <span className="text-brand-primary">{race.distance.toFixed(2)} km</span>}
                                                                <span className="text-zinc-500 text-xs font-normal">
                                                                    {`${Math.floor(race.result / 3600)}h ${Math.floor((race.result % 3600) / 60)}m ${race.result % 60}s`.replace(/^0h /, '')}
                                                                </span>
                                                            </div>
                                                        )
                                                        : `${race.result}m`)
                                                }
                                            </td>
                                            <td className="py-4 text-sm text-zinc-500">
                                                {race.category === 'STRENGTH' ? '--' : (
                                                    <div className="flex flex-col">
                                                        <span>{race.vmax?.toFixed(1)} km/h</span>
                                                        {race.vmax && <span className="text-[10px] opacity-70">{(60 / race.vmax).toFixed(2).replace('.', ':')} min/km</span>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.raceTimes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-zinc-400">
                                                Nenhum resultado de prova registrado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
