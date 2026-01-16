"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getWorkoutsAction } from "@/app/actions/workouts";
import { Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";

export default function PlanilhasPage() {
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchAtleta, setSearchAtleta] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");
    const [filterDate, setFilterDate] = useState("");
    const dateInputRef = useRef<HTMLInputElement>(null);

    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (session && session.user.role === "ATHLETE") {
            router.push("/dashboard/treinos");
            return;
        }

        const load = async () => {
            const data = await getWorkoutsAction();
            setWorkouts(data);
            setLoading(false);
        };
        load();
    }, [session, router]);

    // Helper to format date for display (DD/MM/YYYY)
    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    const filteredWorkouts = workouts.filter(w => {
        const matchesAtleta = w.athleteName.toLowerCase().includes(searchAtleta.toLowerCase());
        const matchesStatus = filterStatus === "all" ? true :
            filterStatus === "completed" ? w.completed : !w.completed;
        const matchesDate = filterDate ? w.date === formatDateToBR(filterDate) : true;

        return matchesAtleta && matchesStatus && matchesDate;
    });

    return (
        <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Planilhas de <span className="text-gradient">Treino</span>
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Gerencie e prescreva treinos para seus atletas.
                    </p>
                </div>
                <Link
                    href="/dashboard/planilhas/nova"
                    className="flex items-center justify-center gap-2 rounded-2xl premium-gradient px-6 py-4 sm:py-3 font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <span className="text-lg">+</span> Nova Planilha
                </Link>
            </header>

            {/* Filters UI */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end bg-white p-6 rounded-3xl shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 ml-1">
                        <Search className="w-3 h-3 text-brand-primary" /> Buscar Atleta
                    </label>
                    <input
                        type="text"
                        placeholder="Nome do atleta..."
                        value={searchAtleta}
                        onChange={(e) => setSearchAtleta(e.target.value)}
                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm dark:bg-zinc-800 dark:ring-zinc-700"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 ml-1">
                        <Filter className="w-3 h-3 text-brand-primary" /> Status
                    </label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm dark:bg-zinc-800 dark:ring-zinc-700 font-medium"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="pending">Pendentes</option>
                        <option value="completed">Concluídos</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 ml-1">
                        <CalendarIcon className="w-3 h-3 text-brand-primary" /> Data Específica
                    </label>
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => dateInputRef.current?.showPicker()}
                    >
                        <input
                            type="text"
                            readOnly
                            value={filterDate ? formatDateToBR(filterDate) : "Todas as datas"}
                            className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm dark:bg-zinc-800 dark:ring-zinc-700 cursor-pointer font-medium"
                        />
                        <input
                            type="date"
                            ref={dateInputRef}
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setSearchAtleta("");
                            setFilterStatus("all");
                            setFilterDate("");
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 py-3 text-sm font-bold text-zinc-600 transition-all dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400"
                    >
                        <X className="w-4 h-4" /> Limpar Filtros
                    </button>
                </div>
            </div>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center text-zinc-500">Carregando treinos...</div>
                ) : workouts.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Nenhuma planilha encontrada</h3>
                        <p className="text-zinc-500">Comece prescrevendo um novo treino para seus atletas.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile view: Cards */}
                        <div className="grid gap-4 p-4 md:hidden">
                            {filteredWorkouts.map((w) => (
                                <Link
                                    key={w.id}
                                    href={`/dashboard/planilhas/${w.id}`}
                                    className="flex flex-col p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Data do Treino</span>
                                            <span className="text-lg font-bold text-zinc-900 dark:text-white">{w.date}</span>
                                        </div>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase ${w.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700 animate-pulse'}`}>
                                            {w.completed ? 'Concluído' : 'Pendente'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Atleta</span>
                                            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">{w.athleteName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Tipo</span>
                                            <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase ${w.type === 'Corrida' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {w.type}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                                        <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">Ver Detalhes do Treino →</span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Desktop view: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left table-fixed">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800">
                                        <th className="px-6 py-4 w-1/4">Data</th>
                                        <th className="px-6 py-4 w-1/4">Atleta</th>
                                        <th className="px-6 py-4 w-1/6">Tipo</th>
                                        <th className="px-6 py-4 w-1/6 text-center">Status</th>
                                        <th className="px-6 py-4 w-1/6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {filteredWorkouts.map((w) => (
                                        <tr key={w.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{w.date}</td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 truncate">{w.athleteName}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${w.type === 'Corrida' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {w.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${w.completed ? 'bg-emerald-500' : 'bg-orange-400 animate-pulse'}`} />
                                                    <span className={`text-[11px] font-bold uppercase ${w.completed ? 'text-emerald-700' : 'text-orange-700'}`}>
                                                        {w.completed ? 'Concluído' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/planilhas/${w.id}`}
                                                    className="text-brand-primary font-bold hover:underline"
                                                >
                                                    Ver Detalhes
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredWorkouts.length === 0 && (
                                <div className="py-20 text-center text-zinc-500">Nenhum treino corresponde aos filtros selecionados.</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
