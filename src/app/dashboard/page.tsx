"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getStudentProfileAction, getCoachDashboardStatsAction } from "@/app/actions/athletes";
import { saveAthleteResultAction, saveStrengthPRAction } from "@/app/actions/metrics";
import { kmhParaPace, calcularZonasDeRitmo } from "@/lib/calculos";
import { getStravaAuthUrl, syncStravaActivitiesAction, disconnectStravaAction } from "@/app/actions/strava";
import { useSearchParams } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle, Unlink, Calendar, X, MessageSquare, Check } from "lucide-react";
import { markFeedbackAsReadAction } from "@/app/actions/workouts";

export default function DashboardPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const isCoach = session?.user?.role === "COACH";
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [dateRange, setDateRange] = useState({
        start: "", // Let server decide default initially
        end: ""
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Feedback do OAuth Strava
    useEffect(() => {
        const success = searchParams.get("strava_success");
        const error = searchParams.get("strava_error");
        if (success) setSyncResult({ type: 'success', message: "Strava conectado com sucesso!" });
        if (error) setSyncResult({ type: 'error', message: `Erro ao conectar: ${error}` });
    }, [searchParams]);

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
        weight: 0
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
                const data = await getStudentProfileAction(dateRange.start || undefined, dateRange.end || undefined);
                setProfile(data);
                // Sync internal range with what server returned if not set
                if (data?.weeklyProgress && !dateRange.start) {
                    setDateRange({
                        start: data.weeklyProgress.startDate,
                        end: data.weeklyProgress.endDate
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
        <div className="space-y-8 animate-slide-up">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Olá, <span className="text-gradient">{session?.user?.name || "Corredor"}</span>!
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Pronto para o treino de hoje?
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">VO2 Máx</p>
                        <p className="text-xl font-bold text-brand-primary">
                            {profile?.vo2 ? `${profile.vo2.toFixed(1)} ml/kg` : "--"}
                        </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900">
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Ritmo Base</p>
                        <p className="text-xl font-bold text-brand-secondary">
                            {profile?.vmax ? `${kmhParaPace(profile.vmax)} min/km` : "--"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-2xl premium-gradient px-6 py-4 font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-105 active:scale-95 sm:self-center"
                >
                    <span>➕</span> Registrar Resultado
                </button>
            </header>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Workout Card */}
                <div className="lg:col-span-2 space-y-6">
                    {profile?.todayWorkout ? (
                        <div className="rounded-3xl premium-gradient p-8 text-white shadow-xl shadow-brand-primary/20">
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                    {profile.todayWorkout.isPast ? "Treino Pendente" :
                                        profile.todayWorkout.isFuture ? "Próximo Treino" : "Treino de Hoje"}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-white/60">{profile.todayWorkout.date}</span>
                                    {profile.todayWorkout.completed && (
                                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md text-emerald-300">
                                            Concluído
                                        </span>
                                    )}
                                </div>
                                <span className="text-2xl">⚡</span>
                            </div>
                            <h2 className="mt-6 text-2xl font-bold">{profile.todayWorkout.type}</h2>
                            <p className="mt-2 text-white/80 line-clamp-2">
                                {profile.todayWorkout.description}
                            </p>
                            <Link
                                href={`/dashboard/planilhas/${profile.todayWorkout.id}`}
                                className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-bold text-brand-primary transition-all hover:scale-105 active:scale-95"
                            >
                                Ver Detalhes do Treino
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-zinc-100 dark:bg-zinc-800/50 p-8 text-center space-y-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                            <div className="text-4xl">🧘‍♂️</div>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Dia de Descanso</h2>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                                    Não há treino prescrito para hoje. Aproveite para recuperar suas energias!
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900">
                        <h3 className="mb-6 text-lg font-bold">Minhas Zonas de Treino</h3>
                        {zones.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {zones.map((zona, i) => (
                                    <div key={i} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                        <span className="text-sm font-medium">{zona.label}</span>
                                        <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">
                                            {zona.paceMax} - {zona.paceMin} <span className="text-[10px] text-zinc-400">min/km</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-2xl">
                                Realize um teste aeróbico para calcular suas zonas.
                            </div>
                        )}
                    </div>

                    {/* Histórico de Resultados */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Meus Últimos Resultados</h3>
                            {profile?.recentRaces?.length > 0 && (
                                <Link href="/dashboard/evolucao" className="text-sm font-bold text-brand-primary hover:underline">Ver tudo</Link>
                            )}
                        </div>
                        {profile?.recentRaces?.length > 0 ? (
                            <div className="space-y-4">
                                {profile.recentRaces.map((race: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50">
                                        <div>
                                            <p className="font-bold text-zinc-900 dark:text-white line-clamp-1">{race.name || race.exercise}</p>
                                            <p className="text-xs text-zinc-400">{race.date} • {race.category === 'STRENGTH' ? 'Musculação' : 'Corrida'}</p>
                                        </div>
                                        <div className="text-right">
                                            {race.category === 'STRENGTH' ? (
                                                <p className="font-mono font-bold text-orange-500">{race.weight} kg</p>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col items-end">
                                                        {race.distance > 0 && <span className="text-xs font-bold text-brand-primary mb-1">{race.distance.toFixed(2)} km</span>}
                                                        <p className="font-mono font-bold text-zinc-500 text-sm leading-none">{race.time}</p>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 uppercase font-bold mt-1">{race.pace} min/km</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-2xl">
                                Você ainda não registrou nenhum resultado de prova ou teste.
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold">Progresso Semanal</h3>
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                                title="Selecionar Período"
                            >
                                <Calendar className="w-5 h-5" />
                            </button>
                        </div>

                        {showDatePicker && (
                            <div className="mb-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold uppercase text-zinc-400">Personalizar Período</p>
                                    <button
                                        onClick={() => setDateRange({ start: "", end: "" })}
                                        className="text-[10px] font-bold text-brand-primary hover:underline"
                                    >
                                        Resetar (Esta Semana)
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-500 ml-1">Início</label>
                                        <input
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="w-full text-xs rounded-lg border-none bg-white dark:bg-zinc-900 p-2 focus:ring-1 focus:ring-brand-primary"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-500 ml-1">Fim</label>
                                        <input
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            className="w-full text-xs rounded-lg border-none bg-white dark:bg-zinc-900 p-2 focus:ring-1 focus:ring-brand-primary"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDatePicker(false)}
                                    className="w-full py-1 text-[10px] font-bold uppercase text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700 mt-2"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-zinc-500">Corrida (km)</span>
                                    <span className="font-bold text-brand-primary">
                                        {profile?.weeklyProgress?.runningKm || 0} / {profile?.weeklyProgress?.runningGoal || 45}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-brand-primary transition-all duration-1000"
                                        style={{ width: `${Math.min(100, ((profile?.weeklyProgress?.runningKm || 0) / (profile?.weeklyProgress?.runningGoal || 45)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-zinc-500">Musculação</span>
                                    <span className="font-bold text-brand-secondary">
                                        {profile?.weeklyProgress?.strengthCount || 0} / {profile?.weeklyProgress?.strengthGoal || 3}
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-brand-secondary transition-all duration-1000"
                                        style={{ width: `${Math.min(100, ((profile?.weeklyProgress?.strengthCount || 0) / (profile?.weeklyProgress?.strengthGoal || 3)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {(dateRange.start && dateRange.end) && (
                            <p className="mt-4 text-[10px] text-center text-zinc-400 font-medium italic">
                                Período: {formatDateToBR(dateRange.start)} - {formatDateToBR(dateRange.end)}
                            </p>
                        )}
                    </div>

                    <div className="rounded-3xl bg-zinc-900 p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-sm text-white/60">Integração Strava</p>
                            {profile?.stravaConnected ? (
                                <>
                                    <h4 className="mt-2 font-bold flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        Conectado ao Strava
                                    </h4>
                                    <div className="mt-6 space-y-3">
                                        <button
                                            onClick={async () => {
                                                setIsSyncing(true);
                                                const res = await syncStravaActivitiesAction();
                                                if (res.success) {
                                                    setSyncResult({ type: 'success', message: `${res.count} atividades sincronizadas!` });
                                                    const data = await getStudentProfileAction();
                                                    setProfile(data);
                                                } else {
                                                    setSyncResult({ type: 'error', message: res.error || "Erro na sincronização" });
                                                }
                                                setIsSyncing(false);
                                            }}
                                            disabled={isSyncing}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-bold transition-all hover:bg-brand-primary/90 disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                            {isSyncing ? "Sincronizando..." : "Sincronizar Atividades"}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm("Deseja realmente desconectar o Strava?")) return;
                                                const res = await disconnectStravaAction();
                                                if (res.success) {
                                                    setSyncResult({ type: 'success', message: "Desconectado com sucesso" });
                                                    const data = await getStudentProfileAction();
                                                    setProfile(data);
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-bold transition-all hover:bg-white/5 text-white/40"
                                        >
                                            <Unlink className="w-4 h-4" />
                                            Desconectar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h4 className="mt-2 font-bold">Conecte seus dispositivos</h4>
                                    <button
                                        onClick={async () => {
                                            const url = await getStravaAuthUrl();
                                            window.location.href = url;
                                        }}
                                        className="mt-6 w-full rounded-xl premium-gradient py-3 text-sm font-bold transition-all hover:scale-105"
                                    >
                                        Conectar Strava
                                    </button>
                                </>
                            )}

                            {syncResult && (
                                <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${syncResult.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {syncResult.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {syncResult.message}
                                </div>
                            )}
                        </div>
                        {/* Background SVG or effect if wanted */}
                    </div>
                </div>
            </div>
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
                                    name: resultData.name
                                });
                            } else {
                                res = await saveStrengthPRAction({
                                    date: resultData.date,
                                    exercise: resultData.exercise,
                                    weight: resultData.weight
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
        </div>
    );
}
