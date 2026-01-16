"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAthleteAction, updateAthleteProfileAction } from "@/app/actions/athletes";
import { ArrowLeft, User, Ruler, Weight, Calendar, TrendingUp, Edit2, X, Save, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function AthleteProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [athlete, setAthlete] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"TESTS" | "STRENGTH" | "RACE">("TESTS");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const [editForm, setEditForm] = useState({
        peso: "",
        altura: "",
        dataNascimento: "",
        gender: "",
        weeklyRunningGoal: "",
        weeklyStrengthGoal: ""
    });

    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    const loadProfile = async () => {
        setLoading(true);
        const data = await getAthleteAction(id);
        setAthlete(data);
        if (data) {
            setEditForm({
                peso: data.peso?.toString() || "",
                altura: data.altura?.toString() || "",
                dataNascimento: data.dataNascimento || "",
                gender: data.gender || "",
                weeklyRunningGoal: data.weeklyRunningGoal?.toString() || "45",
                weeklyStrengthGoal: data.weeklyStrengthGoal?.toString() || "3"
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProfile();
    }, [id]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const res = await updateAthleteProfileAction({
            id,
            peso: editForm.peso ? parseFloat(editForm.peso) : undefined,
            altura: editForm.altura ? parseFloat(editForm.altura) : undefined,
            dataNascimento: editForm.dataNascimento,
            gender: editForm.gender,
            weeklyRunningGoal: parseFloat(editForm.weeklyRunningGoal),
            weeklyStrengthGoal: parseInt(editForm.weeklyStrengthGoal)
        } as any);

        if (res.success) {
            await loadProfile();
            setIsEditModalOpen(false);
        } else {
            alert(res.error);
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-zinc-500">Carregando perfil...</div>
            </div>
        );
    }

    if (!athlete) {
        return (
            <div className="p-8 text-center bg-white rounded-3xl shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Atleta não encontrado</h2>
                <button
                    onClick={() => router.back()}
                    className="text-brand-primary hover:underline"
                >
                    Voltar para lista
                </button>
            </div>
        );
    }

    const filteredMetrics = athlete.metrics.filter((m: any) => {
        if (filter === "TESTS") return m.category === 'AEROBIC' || m.category === 'SPEED';
        if (filter === "STRENGTH") return m.category === 'STRENGTH';
        if (filter === "RACE") return m.category === 'RACE';
        return true;
    });

    const formatRaceTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`.replace(/^0h /, '');
    };

    const kmhParaPace = (kmh: number) => {
        if (!kmh) return "--";
        const totalMinutes = 60 / kmh;
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.round((totalMinutes - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8 animate-slide-up pb-12">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                        Perfil do <span className="text-gradient">Atleta</span>
                    </h1>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-3 w-full">
                {/* Info Card */}
                <div className="lg:col-span-1 space-y-6 min-w-0">
                    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="h-16 w-16 sm:h-24 sm:w-24 flex-shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                                {athlete.image ? (
                                    <img src={athlete.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="relative group/name block">
                                    <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate pr-6">{athlete.name}</h2>
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-brand-primary text-white shadow-sm hover:scale-110 active:scale-95 transition-all"
                                        title="Editar Perfil"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-zinc-500 text-xs sm:text-sm truncate">{athlete.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                                <div className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2 mb-1 sm:mb-2">
                                    <Calendar className="w-3.5 h-3.5 text-brand-primary" /> Idade
                                </div>
                                <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                                    {athlete.idade ? `${athlete.idade} anos` : "--"}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                                <div className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2 mb-1 sm:mb-2">
                                    <Weight className="w-3.5 h-3.5 text-brand-primary" /> Peso
                                </div>
                                <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                                    {athlete.peso ? `${athlete.peso} kg` : "--"}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                                <div className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2 mb-1 sm:mb-2">
                                    <Ruler className="w-3.5 h-3.5 text-brand-primary" /> Altura
                                </div>
                                <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                                    {athlete.altura ? `${athlete.altura} m` : "--"}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                                <div className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-2 mb-1 sm:mb-2">
                                    <User className="w-3.5 h-3.5 text-brand-primary" /> Sexo
                                </div>
                                <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                                    {athlete.gender === "M" ? "Masc." : athlete.gender === "F" ? "Fem." : "--"}
                                </div>
                            </div>
                        </div>

                        <Link
                            href={`/dashboard/alunos/${id}/anamnese`}
                            className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 py-4 text-sm font-bold text-zinc-900 dark:text-white ring-1 ring-zinc-200 dark:ring-zinc-700 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-[0.98]"
                        >
                            <ClipboardList size={20} className="text-brand-primary" />
                            Dados de Anamnese
                        </Link>

                        {/* Progresso Semanal (Novo) */}
                        {athlete.weeklyProgress && (
                            <div className="mt-8 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-brand-primary" />
                                    Progresso da Semana
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 uppercase font-bold text-zinc-500">
                                            <span>Corrida (km)</span>
                                            <span className="text-brand-primary">
                                                {athlete.weeklyProgress.runningKm} / {athlete.weeklyProgress.runningGoal}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                                            <div
                                                className="h-full rounded-full bg-brand-primary transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (athlete.weeklyProgress.runningKm / athlete.weeklyProgress.runningGoal) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1 uppercase font-bold text-zinc-500">
                                            <span>Musculação</span>
                                            <span className="text-brand-secondary">
                                                {athlete.weeklyProgress.strengthCount} / {athlete.weeklyProgress.strengthGoal}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                                            <div
                                                className="h-full rounded-full bg-brand-secondary transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (athlete.weeklyProgress.strengthCount / athlete.weeklyProgress.strengthGoal) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-[10px] text-center text-zinc-400 font-medium italic">
                                    {athlete.weeklyProgress.startDate} até {athlete.weeklyProgress.endDate}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results History */}
                <div className="lg:col-span-2 space-y-8 min-w-0">
                    <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                        <div className="flex flex-col gap-6 mb-8">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-6 h-6 text-brand-primary" />
                                Histórico de Resultados
                            </h3>

                            <div className="flex p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                                <div className="flex gap-1 min-w-max">
                                    {[
                                        { id: "TESTS", label: "Testes" },
                                        { id: "STRENGTH", label: "Musculação" },
                                        { id: "RACE", label: "Provas/Longos" }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setFilter(tab.id as any)}
                                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${filter === tab.id
                                                ? "bg-white shadow-sm ring-1 ring-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:ring-zinc-600 dark:text-white"
                                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {athlete.metrics.length === 0 ? (
                            <div className="py-12 text-center text-zinc-500">
                                Nenhum resultado registrado ainda.
                            </div>
                        ) : (
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
                                <table className="w-full text-left text-sm min-w-[600px]">
                                    <thead>
                                        <tr className="text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                                            <th className="pb-4 font-medium px-2">Data</th>
                                            <th className="pb-4 font-medium px-2">
                                                {filter === "RACE" ? "Prova" : filter === "STRENGTH" ? "Exercício" : "Teste / Exercício"}
                                            </th>

                                            {filter === "RACE" ? (
                                                <>
                                                    <th className="pb-4 font-medium text-center px-2">Distância</th>
                                                    <th className="pb-4 font-medium text-center px-2">Tempo</th>
                                                    <th className="pb-4 font-medium text-center px-2">Pace</th>
                                                </>
                                            ) : filter === "STRENGTH" ? (
                                                <>
                                                    <th className="pb-4 font-medium text-center px-2">Carga</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="pb-4 font-medium text-center px-2">Resultado</th>
                                                    <th className="pb-4 font-medium text-center px-2">VO2 / Vmax</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                        {filteredMetrics.map((m: any) => (
                                            <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="py-4 text-zinc-900 dark:text-white font-medium px-2">{m.date}</td>
                                                <td className="py-4 text-zinc-600 dark:text-zinc-400 px-2">
                                                    <div className="flex flex-col">
                                                        <span className="capitalize">{m.exercise || m.testType}</span>
                                                        {m.testType === "STRAVA_IMPORT" && <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">STRAVA</span>}
                                                    </div>
                                                </td>

                                                {filter === "RACE" ? (
                                                    <>
                                                        <td className="py-4 text-center font-bold text-zinc-900 dark:text-white px-2">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-brand-primary">{m.vmax ? ((m.rawResult * (m.vmax / 3.6)) / 1000).toFixed(2) : "--"} km</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center font-mono font-bold text-brand-secondary px-2">
                                                            {formatRaceTime(m.rawResult)}
                                                        </td>
                                                        <td className="py-4 text-center px-2">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs font-bold text-zinc-500">{kmhParaPace(m.vmax)}</span>
                                                                <span className="text-[9px] text-zinc-400">min/km</span>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : filter === "STRENGTH" ? (
                                                    <>
                                                        <td className="py-4 text-center font-bold text-orange-600 px-2">
                                                            {m.rawResult}
                                                            <span className="text-[10px] ml-1 text-zinc-500 uppercase">kg</span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="py-4 text-center font-bold text-zinc-900 dark:text-white px-2">
                                                            {m.category === 'RACE' ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-brand-primary">
                                                                        {m.vmax ? ((m.rawResult * (m.vmax / 3.6)) / 1000).toFixed(2) : "--"} km
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-500 font-normal">{formatRaceTime(m.rawResult)}</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {m.result}
                                                                    <span className="text-[10px] ml-1 text-zinc-500 uppercase">
                                                                        {m.category === 'STRENGTH' ? 'kg' : m.category === 'SPEED' ? 's' : 'm'}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="py-4 text-center px-2">
                                                            {m.category === 'RACE' ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-zinc-600 font-bold">{m.vmax?.toFixed(1)} km/h</span>
                                                                    <span className="text-[9px] text-zinc-400">{kmhParaPace(m.vmax)} min/km</span>
                                                                </div>
                                                            ) : m.vo2 ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{m.vo2.toFixed(1)}</span>
                                                                    <span className="text-[9px] text-zinc-500">{m.vmax.toFixed(1)} km/h</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-zinc-400 text-xs">--</span>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Editar Perfil do Atleta</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-500" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        <Weight className="w-3 h-3 text-brand-primary" /> Peso (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editForm.peso}
                                        onChange={(e) => setEditForm({ ...editForm, peso: e.target.value })}
                                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
                                        placeholder="Ex: 75.5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        <Ruler className="w-3 h-3 text-brand-primary" /> Altura (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.altura}
                                        onChange={(e) => setEditForm({ ...editForm, altura: e.target.value })}
                                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
                                        placeholder="Ex: 1.75"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-brand-primary" /> Data de Nascimento
                                </label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        value={editForm.dataNascimento}
                                        onChange={(e) => setEditForm({ ...editForm, dataNascimento: e.target.value })}
                                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white font-medium appearance-none"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-brand-primary transition-colors bg-zinc-50 dark:bg-zinc-800 px-1">
                                        📅
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                    <User className="w-3 h-3 text-brand-primary" /> Sexo
                                </label>
                                <select
                                    value={editForm.gender}
                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                    className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        🏃 Meta Corrida (km)
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.weeklyRunningGoal}
                                        onChange={(e) => setEditForm({ ...editForm, weeklyRunningGoal: e.target.value })}
                                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
                                        placeholder="Ex: 45"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                        💪 Meta Musculação
                                    </label>
                                    <input
                                        type="number"
                                        value={editForm.weeklyStrengthGoal}
                                        onChange={(e) => setEditForm({ ...editForm, weeklyStrengthGoal: e.target.value })}
                                        className="w-full rounded-xl bg-zinc-50 border-0 ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary px-4 py-3 text-sm text-zinc-900 dark:bg-zinc-800 dark:ring-zinc-700 dark:text-white"
                                        placeholder="Ex: 3"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-6 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 premium-gradient text-white px-6 py-3 text-sm font-bold rounded-xl shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        "Salvando..."
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Salvar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )
            }
        </div >
    );
}
