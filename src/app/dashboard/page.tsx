"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getStudentProfileAction, getCoachDashboardStatsAction } from "@/app/actions/athletes";
import { saveAthleteResultAction, saveStrengthPRAction } from "@/app/actions/metrics";
import { kmhParaPace, calcularZonasDeRitmo } from "@/lib/calculos";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Calendar, X, MessageSquare, Check } from "lucide-react";
import { markFeedbackAsReadAction } from "@/app/actions/workouts";
import { getAthleteNutritionAction, saveMealLogAction } from "@/app/actions/nutrition";
import { AthleteDashboardUnified } from "@/components/dashboard/AthleteDashboardUnified";

export default function DashboardPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const isCoach = session?.user?.role === "COACH";
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: "", // Let server decide default initially
        end: ""
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [nutrition, setNutrition] = useState<any>(null);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);


    // Modal state for Athlete Results
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [resultType, setResultType] = useState<"RACE" | "STRENGTH">("RACE");
    const [resultData, setResultData] = useState({
        date: new Date().toISOString().split('T')[0],
        distance: 5000,
        hours: 0,
        minutes: 25,
        seconds: 0,
        name: "",
        exercise: "",
        weight: 0,
        caloriesBurned: 0
    });

    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };
    const [isSaving, setIsSaving] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadData = async () => {
            if (isCoach) {
                const data = await getCoachDashboardStatsAction();
                setStats(data);
            } else if (session?.user) {
                const [profileData, nutritionData] = await Promise.all([
                    getStudentProfileAction(dateRange.start || undefined, dateRange.end || undefined),
                    getAthleteNutritionAction()
                ]);

                setProfile(profileData);
                if (nutritionData.success) {
                    setNutrition(nutritionData.data);
                }

                // Sync internal range with what server returned if not set
                if (profileData?.weeklyProgress && !dateRange.start) {
                    setDateRange({
                        start: profileData.weeklyProgress.startDate,
                        end: profileData.weeklyProgress.endDate
                    });
                }
            }
            setLoading(false);
        };

        if (session?.user) {
            loadData();
        }
    }, [isCoach, session, dateRange.start, dateRange.end]);

    if (isCoach) {
        // ... (Treinador view remains same)
        return (
            <div className="space-y-8 animate-slide-up">
                <header>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Painel do <span className="text-gradient">Treinador</span>
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Gerencie seus atletas, analise testes e prescreva treinos.
                        <span className="text-[8px] opacity-10 ml-2">v-diag-001</span>
                    </p>
                </header>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: "Total de Alunos", value: stats?.totalAthletes !== undefined ? `${stats.totalAthletes}/10` : "0/10", icon: "👥", color: "from-blue-500 to-cyan-500" },
                        { label: "Treinos Prescritos (Hoje)", value: stats?.totalWorkoutsToday ?? "0", icon: "📝", color: "from-purple-500 to-indigo-500" },
                        { label: "Testes Pendentes", value: stats?.pendingTests ?? "0", icon: "🧪", color: "from-orange-500 to-rose-500" },
                        { label: "Alertas de Feedback", value: stats?.feedbackAlerts ?? "0", icon: "⚠️", color: "from-red-500 to-rose-500", onClick: () => setIsFeedbackModalOpen(true) },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            onClick={stat.onClick}
                            className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 ${stat.onClick ? 'cursor-pointer hover:ring-brand-primary/50 transition-all active:scale-[0.98]' : ''}`}
                        >
                            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="text-3xl font-bold">{stat.value}</span>
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                        <h3 className="text-lg font-bold mb-4">Próximos Testes</h3>
                        <div className="flex items-center justify-center p-8 border-2 border-dashed border-zinc-100 rounded-2xl">
                            <p className="text-zinc-400">Nenhum teste agendado para hoje.</p>
                        </div>
                    </div>
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 flex flex-col">
                        <h3 className="text-lg font-bold mb-4">Atividade dos Alunos</h3>
                        {stats?.recentActivities?.length > 0 ? (
                            <div className="space-y-4 flex-1">
                                {stats.recentActivities.map((activity: any) => (
                                    <div key={activity.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                                        <div className="min-w-0">
                                            <p className="font-bold text-zinc-900 dark:text-white truncate">{activity.athleteName}</p>
                                            <p className="text-xs text-zinc-500 line-clamp-1">{activity.exercise}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <div className="flex flex-col items-end">
                                                <p className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                                                    {(() => {
                                                        const s = activity.result;
                                                        const h = Math.floor(s / 3600);
                                                        const min = Math.floor((s % 3600) / 60);
                                                        const sec = Math.round(s % 60);
                                                        return `${h > 0 ? h + 'h ' : ''}${min}m ${sec}s`;
                                                    })()}
                                                </p>
                                                {activity.vmax > 0 && (
                                                    <p className="text-[10px] text-zinc-400 uppercase font-bold mt-1">
                                                        {kmhParaPace(activity.vmax)} min/km
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                                <p className="text-zinc-400">Sem atividades registradas hoje.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Alerts Modal */}
                {isFeedbackModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                        <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Feedbacks dos Alunos</h3>
                                </div>
                                <button
                                    onClick={() => setIsFeedbackModalOpen(false)}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {(!stats?.feedbackWorkouts || stats.feedbackWorkouts.length === 0) ? (
                                    <div className="py-12 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-20" />
                                        <p className="text-zinc-500">Nenhum feedback novo por enquanto!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {stats.feedbackWorkouts.map((workout: any) => (
                                            <div key={workout.id} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 group hover:border-orange-200 dark:hover:border-orange-900/50 transition-all">
                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                    <div>
                                                        <p className="font-bold text-zinc-900 dark:text-white">{workout.athleteName}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                {workout.type}
                                                            </span>
                                                            <span className="text-xs text-zinc-400">{workout.date}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await markFeedbackAsReadAction(workout.id);
                                                            if (res.success) {
                                                                const newStats = await getCoachDashboardStatsAction();
                                                                setStats(newStats);
                                                            }
                                                        }}
                                                        className="p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all"
                                                        title="Marcar como lido"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 italic text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 group-hover:line-clamp-none transition-all">
                                                    "{workout.feedbackText}"
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <Link
                                                        href={`/dashboard/planilhas/${workout.id}`}
                                                        className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                                                    >
                                                        Ver treino completo →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsFeedbackModalOpen(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Carregando seus dados...</div>;
    }

    const zones = profile?.vmax ? calcularZonasDeRitmo(profile.vmax) : [];

    // Dashboard do Atleta
    return (
        <>
            <AthleteDashboardUnified
                profile={profile}
                nutrition={nutrition}
                session={session}
                onSaveResult={() => setIsModalOpen(true)}
                onLogMeal={() => setIsMealModalOpen(true)}
                onUpdateNutrition={async () => {
                    const res = await getAthleteNutritionAction();
                    if (res.success) setNutrition(res.data);
                }}
                dateRange={dateRange}
                onOpenDatePicker={() => setShowDatePicker(!showDatePicker)}
                formatDateToBR={formatDateToBR}
                isMealModalOpen={isMealModalOpen}
                onCloseMealModal={() => setIsMealModalOpen(false)}
                onSaveMeal={async (data) => {
                    const res = await saveMealLogAction(data);
                    if (res.success) {
                        setIsMealModalOpen(false);
                        const nutr = await getAthleteNutritionAction();
                        if (nutr.success) setNutrition(nutr.data);
                    } else {
                        alert(res.error || "Erro ao salvar refeição");
                    }
                }}
            />

            {/* Modal de Resultado de Prova */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-center p-4 backdrop-blur-sm bg-black/40 overflow-y-auto pt-10 sm:pt-24">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 animate-slide-up h-fit mb-20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Registrar Resultado</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <span className="text-2xl">×</span>
                            </button>
                        </div>

                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6">
                            <button
                                type="button"
                                onClick={() => setResultType("RACE")}
                                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${resultType === 'RACE' ? 'bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-600' : 'text-zinc-500'}`}
                            >
                                Corrida / Prova
                            </button>
                            <button
                                type="button"
                                onClick={() => setResultType("STRENGTH")}
                                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${resultType === 'STRENGTH' ? 'bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-600' : 'text-zinc-500'}`}
                            >
                                Musculação (PR)
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSaving(true);

                            let res;
                            if (resultType === "RACE") {
                                const totalSeconds = (resultData.hours * 3600) + (resultData.minutes * 60) + resultData.seconds;
                                res = await saveAthleteResultAction({
                                    date: resultData.date,
                                    distance: resultData.distance,
                                    timeSeconds: totalSeconds,
                                    name: resultData.name,
                                    caloriesBurned: resultData.caloriesBurned
                                });
                            } else {
                                res = await saveStrengthPRAction({
                                    date: resultData.date,
                                    exercise: resultData.exercise,
                                    weight: resultData.weight,
                                    caloriesBurned: resultData.caloriesBurned
                                });
                            }

                            if (res.success) {
                                setIsModalOpen(false);
                                // Recarregar perfil
                                const data = await getStudentProfileAction();
                                setProfile(data);
                            } else {
                                alert(res.error || "Erro ao salvar resultado");
                            }
                            setIsSaving(false);
                        }}>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600">Data</label>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => dateInputRef.current?.showPicker()}
                                >
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatDateToBR(resultData.date)}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 text-sm font-medium cursor-pointer"
                                    />
                                    <input
                                        type="date"
                                        ref={dateInputRef}
                                        value={resultData.date}
                                        onChange={e => setResultData({ ...resultData, date: e.target.value })}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-brand-primary transition-colors">
                                        📅
                                    </div>
                                </div>
                            </div>

                            {resultType === "RACE" ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600">Descrição / Nome da Prova</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Meia Maratona do Rio"
                                            value={resultData.name}
                                            onChange={e => setResultData({ ...resultData, name: e.target.value })}
                                            className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600">Distância (m)</label>
                                        <input
                                            type="number"
                                            placeholder="5000"
                                            value={resultData.distance}
                                            onChange={e => setResultData({ ...resultData, distance: Number(e.target.value) })}
                                            className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600 font-mono">Tempo (HH:MM:SS)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                type="number"
                                                placeholder="HH"
                                                value={resultData.hours}
                                                min={0}
                                                onChange={e => setResultData({ ...resultData, hours: Number(e.target.value) })}
                                                className="w-full rounded-2xl bg-zinc-50 border-none px-2 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 text-center"
                                            />
                                            <input
                                                type="number"
                                                placeholder="MM"
                                                value={resultData.minutes}
                                                min={0}
                                                max={59}
                                                onChange={e => setResultData({ ...resultData, minutes: Number(e.target.value) })}
                                                className="w-full rounded-2xl bg-zinc-50 border-none px-2 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 text-center"
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="SS"
                                                value={resultData.seconds}
                                                min={0}
                                                max={59}
                                                onChange={e => setResultData({ ...resultData, seconds: Number(e.target.value) })}
                                                className="w-full rounded-2xl bg-zinc-50 border-none px-2 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 text-center"
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600">Exercício</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Supino Reto, Agachamento"
                                            value={resultData.exercise}
                                            onChange={e => setResultData({ ...resultData, exercise: e.target.value })}
                                            className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-600">Carga Máxima (kg)</label>
                                        <input
                                            type="number"
                                            placeholder="80"
                                            value={resultData.weight}
                                            onChange={e => setResultData({ ...resultData, weight: Number(e.target.value) })}
                                            className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                            required
                                            min={0}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600">Calorias Gastas (Opcional)</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 350"
                                    value={resultData.caloriesBurned}
                                    onChange={e => setResultData({ ...resultData, caloriesBurned: Number(e.target.value) })}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    min={0}
                                />
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Isso ajudará no seu balanço nutricional diário</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full mt-4 rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? "Salvando..." : resultType === "RACE" ? "Confirmar" : "Confirmar PR"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
