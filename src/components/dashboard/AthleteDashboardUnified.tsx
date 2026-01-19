"use client";

import React from "react";
import Link from "next/link";
import { MacroProgressRings } from "./MacroProgressRings";
import { WaterTracker } from "./WaterTracker";
import { kmhParaPace } from "@/lib/calculos";
import {
    Calendar,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Unlink,
    Plus,
    Flame,
    Target,
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

interface AthleteDashboardUnifiedProps {
    profile: any;
    nutrition: any;
    session: any;
    isSyncing: boolean;
    syncResult: any;
    onSyncStrava: () => void;
    onDisconnectStrava: () => void;
    onSaveResult: () => void;
    onUpdateNutrition: () => void;
    onStravaAuth: () => void;
    dateRange: any;
    onOpenDatePicker: () => void;
    formatDateToBR: (date: string) => string;
}

export const AthleteDashboardUnified: React.FC<AthleteDashboardUnifiedProps> = ({
    profile,
    nutrition,
    session,
    isSyncing,
    syncResult,
    onSyncStrava,
    onDisconnectStrava,
    onSaveResult,
    onUpdateNutrition,
    onStravaAuth,
    dateRange,
    onOpenDatePicker,
    formatDateToBR
}) => {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-slide-up">
            {/* Header / Welcome */}
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                    Olá, <span className="text-gradient">{session?.user?.name?.split(' ')[0] || "Atleta"}</span>!
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Pronto para superar seus limites hoje?
                </p>
            </header>

            {/* Nutrition Overview Cards */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-rose-500" />
                        <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Metas Nutricionais</h3>
                    </div>
                    <MacroProgressRings
                        proteins={{ current: nutrition?.current?.proteins || 0, target: nutrition?.goal?.targetProteins || 150 }}
                        carbs={{ current: nutrition?.current?.carbs || 0, target: nutrition?.goal?.targetCarbs || 200 }}
                        fats={{ current: nutrition?.current?.fats || 0, target: nutrition?.goal?.targetFats || 60 }}
                    />
                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <p className="text-xs text-zinc-500">CONSUMIDO: <span className="font-bold text-zinc-900 dark:text-white">{nutrition?.current?.calories || 0} kcal</span></p>
                        <p className="text-xs text-zinc-500">META: <span className="font-bold text-zinc-900 dark:text-white">{nutrition?.goal?.targetCalories || 2000} kcal</span></p>
                    </div>
                </div>

                <WaterTracker
                    current={nutrition?.current?.water || 0}
                    target={nutrition?.goal?.targetWater || 2.5}
                    onUpdate={onUpdateNutrition}
                />
            </div>

            {/* Workout of the Day */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        Treino do Dia
                    </h3>
                </div>

                {profile?.todayWorkout ? (
                    <motion.div
                        whileHover={{ y: -4 }}
                        className="group relative overflow-hidden rounded-[2.5rem] premium-gradient p-8 text-white shadow-xl shadow-brand-primary/20"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <span className="rounded-full bg-white/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                                    {profile.todayWorkout.isPast ? "Treino Pendente" :
                                        profile.todayWorkout.isFuture ? "Próximo Treino" : "Disponível"}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white/70">{profile.todayWorkout.date}</span>
                                    {profile.todayWorkout.completed && (
                                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md text-emerald-300">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Concluído
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-3xl font-black mb-3">{profile.todayWorkout.type}</h2>
                            <p className="text-white/80 font-medium line-clamp-2 mb-10 max-w-lg">
                                {profile.todayWorkout.description}
                            </p>

                            <Link
                                href={`/dashboard/planilhas/${profile.todayWorkout.id}`}
                                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-brand-primary transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
                            >
                                Iniciar Treino
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>

                        {/* Decorative Pattern Component would go here */}
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-[25deg]">
                            <Flame size={240} strokeWidth={1} />
                        </div>
                    </motion.div>
                ) : (
                    <div className="rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800/50 p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                        <div className="text-5xl mb-4">🧘‍♂️</div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Dia de Descanso Ativo</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto">
                            Aproveite para focar na sua nutrição e recuperação hoje!
                        </p>
                    </div>
                )}
            </section>

            {/* Existing Stats (Weekly Progress, Recent Results) */}
            <div className="grid gap-8 lg:grid-cols-2">
                {/* Weekly Progress */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-lg">Consistência Semanal</h3>
                        <button onClick={onOpenDatePicker} className="p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                            <Calendar className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                <span className="text-zinc-400">Corrida</span>
                                <span className="text-brand-primary">
                                    {profile?.weeklyProgress?.runningKm || 0} / {profile?.weeklyProgress?.runningGoal || 45} KM
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-zinc-50 dark:bg-zinc-800 p-0.5">
                                <motion.div
                                    className="h-full rounded-full bg-brand-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, ((profile?.weeklyProgress?.runningKm || 0) / (profile?.weeklyProgress?.runningGoal || 45)) * 100)}%` }}
                                    transition={{ duration: 1.5 }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                <span className="text-zinc-400">Musculação</span>
                                <span className="text-brand-secondary">
                                    {profile?.weeklyProgress?.strengthCount || 0} / {profile?.weeklyProgress?.strengthGoal || 3} SESSÕES
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-zinc-50 dark:bg-zinc-800 p-0.5">
                                <motion.div
                                    className="h-full rounded-full bg-brand-secondary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, ((profile?.weeklyProgress?.strengthCount || 0) / (profile?.weeklyProgress?.strengthGoal || 3)) * 100)}%` }}
                                    transition={{ duration: 1.5 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strava Integration */}
                <div className="rounded-3xl bg-zinc-900 p-8 text-white flex flex-col justify-between overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Integração Strava</p>
                            {profile?.stravaConnected && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    SYNC ON
                                </div>
                            )}
                        </div>

                        {profile?.stravaConnected ? (
                            <div className="space-y-4">
                                <button
                                    onClick={onSyncStrava}
                                    disabled={isSyncing}
                                    className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-brand-primary font-black text-sm transition-all hover:bg-brand-primary/90 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    {isSyncing ? "SINCRONIZANDO..." : "ATUALIZAR TREINOS"}
                                </button>
                                <button
                                    onClick={onDisconnectStrava}
                                    className="w-full py-3 text-[10px] font-black tracking-widest text-white/30 hover:text-white/60 transition-all uppercase"
                                >
                                    Desconectar Dispositivo
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h4 className="text-xl font-black mb-2">Conecte seus dispositivos</h4>
                                <p className="text-sm text-white/50 mb-8 leading-relaxed">
                                    Importe suas atividades automaticamente do Strava.
                                </p>
                                <button
                                    onClick={onStravaAuth}
                                    className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl premium-gradient font-black text-sm transition-all hover:scale-[1.02]"
                                >
                                    Conectar Agora
                                </button>
                            </div>
                        )}

                        {syncResult && (
                            <div className={`mt-4 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${syncResult.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {syncResult.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {syncResult.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Last Results */}
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black italic uppercase tracking-tight">Meus Últimos Resultados</h3>
                    <Link href="/dashboard/evolucao" className="text-xs font-black text-brand-primary hover:underline uppercase tracking-widest">Ver tudo</Link>
                </div>

                {profile?.recentRaces?.length > 0 ? (
                    <div className="space-y-3">
                        {profile.recentRaces.slice(0, 3).map((race: any, i: number) => (
                            <div key={i} className="group flex items-center justify-between p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${race.category === 'STRENGTH' ? 'bg-orange-100 text-orange-600' : 'bg-brand-primary/10 text-brand-primary'}`}>
                                        {race.category === 'STRENGTH' ? '🏋️' : '🏃'}
                                    </div>
                                    <div>
                                        <p className="font-black text-zinc-900 dark:text-white uppercase text-xs tracking-tight">{race.name || race.exercise}</p>
                                        <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">{race.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {race.category === 'STRENGTH' ? (
                                        <p className="text-lg font-black text-orange-500">{race.weight}<span className="text-[10px] ml-0.5">KG</span></p>
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <p className="text-lg font-black text-brand-primary leading-none">{race.time}</p>
                                            <p className="text-[10px] font-black text-zinc-400 mt-1 uppercase tracking-tighter">{race.pace} MIN/KM</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-zinc-400 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                        Ainda não há resultados registrados.
                    </div>
                )}
            </div>

            {/* FAB (Floating Action Button) */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onSaveResult}
                    className="flex items-center gap-2 rounded-full premium-gradient px-8 py-4 font-black text-white shadow-2xl shadow-brand-primary/40 text-sm border-4 border-white dark:border-zinc-900"
                >
                    <Plus className="w-5 h-5" />
                    REGISTRAR
                </motion.button>
            </div>
        </div>
    );
};
