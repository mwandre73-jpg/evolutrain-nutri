"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWorkoutDetailAction, markWorkoutAsCompletedAction, deleteWorkoutAction, saveWorkoutFeedbackAction } from "@/app/actions/workouts";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { MessageSquare, Star, Send } from "lucide-react";

export default function WorkoutDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [workout, setWorkout] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingFeedback, setSavingFeedback] = useState(false);
    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [feedback, setFeedback] = useState({
        perception: 5,
        text: ""
    });
    const { data: session } = useSession();
    const isCoach = session?.user?.role === "COACH";

    useEffect(() => {
        if (id) {
            getWorkoutDetailAction(id as string).then((data: any) => {
                setWorkout(data);
                if (data?.feedbackText) {
                    setFeedback({
                        perception: data.feedbackPerception || 5,
                        text: data.feedbackText
                    });
                }
                setLoading(false);
            });
        }
    }, [id]);

    const handleSaveFeedback = async () => {
        if (feedback.text.length < 5) {
            alert("Por favor, escreva suas percepções antes de salvar.");
            return;
        }

        setSavingFeedback(true);
        const res = await saveWorkoutFeedbackAction(id as string, feedback);
        if (res.success) {
            setWorkout({ ...workout, completed: true, feedbackText: feedback.text, feedbackPerception: feedback.perception });
            setIsEditingFeedback(false);
        } else {
            alert(res.error || "Erro ao salvar feedback");
        }
        setSavingFeedback(false);
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.")) return;

        setDeleting(true);
        const res = await deleteWorkoutAction(id as string);
        if (res.success) {
            router.push("/dashboard/planilhas");
        } else {
            alert(res.error || "Erro ao excluir treino");
            setDeleting(false);
        }
    };

    if (loading) {
        return <div className="py-20 text-center text-zinc-500">Carregando detalhes do treino...</div>;
    }

    if (!workout) {
        return (
            <div className="py-20 text-center">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Treino não encontrado</h3>
                <Link href="/dashboard/planilhas" className="mt-4 text-brand-primary hover:underline">
                    Voltar para a lista
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <Link
                        href={isCoach ? "/dashboard/planilhas" : "/dashboard/treinos"}
                        className="text-sm font-bold text-brand-primary hover:underline mb-1 inline-block"
                    >
                        ← Voltar para {isCoach ? "Planilhas" : "Treinos"}
                    </Link>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Detalhes do <span className="text-gradient">Treino</span>
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isCoach && (
                        <>
                            <Link
                                href={`/dashboard/planilhas/${id}/editar`}
                                className="flex-1 sm:flex-none text-center rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                                Editar
                            </Link>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 sm:flex-none rounded-xl bg-red-50 px-4 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                            >
                                {deleting ? "Excluindo..." : "Excluir"}
                            </button>
                        </>
                    )}
                    {(!workout.completed || isEditingFeedback) && !isCoach && (
                        <button
                            onClick={handleSaveFeedback}
                            disabled={savingFeedback}
                            className="hidden sm:flex w-full sm:w-auto rounded-xl bg-emerald-500 px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 items-center justify-center gap-2"
                        >
                            <Send size={18} />
                            {savingFeedback ? "Salvando..." : (workout.completed ? "Atualizar Feedback" : "Concluir Treino com Feedback")}
                        </button>
                    )}
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 space-y-8">
                        {/* Status Badge */}
                        <div className="flex items-center gap-4">
                            <span className={`rounded-xl px-4 py-1.5 text-xs font-bold uppercase ${workout.type === 'Corrida' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                {workout.type}
                            </span>
                            <span className={`rounded-xl px-4 py-1.5 text-xs font-bold uppercase ${workout.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                {workout.completed ? 'Concluído' : 'Pendente'}
                            </span>
                        </div>

                        {/* Title Info */}
                        <div className="grid gap-6 sm:grid-cols-2 text-sm">
                            <div>
                                <p className="font-bold text-zinc-400 uppercase text-[10px]">Atleta</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-white">{workout.athleteName}</p>
                            </div>
                            <div>
                                <p className="font-bold text-zinc-400 uppercase text-[10px]">Data</p>
                                <p className="text-lg font-bold text-zinc-900 dark:text-white">{workout.date}</p>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <p className="font-bold text-zinc-400 uppercase text-[10px] mb-4">Instruções do Treino</p>
                            <div className="whitespace-pre-line text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl font-mono text-sm">
                                {workout.description}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl">
                        <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Intensidade Prescrita</p>
                        <p className="text-2xl font-bold text-brand-primary">{workout.prescribedIntensity}</p>

                        {workout.calculatedZones && (
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <p className="text-[10px] uppercase font-bold text-white/40 mb-4">Zonas de Ritmo Sugeridas</p>
                                <div className="space-y-3 font-mono text-xs">
                                    <p className="text-white/60 leading-relaxed">{workout.calculatedZones}</p>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 rounded-2xl bg-white/5 p-4 text-xs text-white/60">
                            <p>💡 Execute conforme as zonas indicadas para melhores resultados.</p>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <MessageSquare size={20} className="text-brand-primary" /> Feedback
                            </h3>
                            {workout.completed && !isCoach && !isEditingFeedback && (
                                <button
                                    onClick={() => setIsEditingFeedback(true)}
                                    className="text-[10px] font-bold text-brand-primary hover:underline uppercase"
                                >
                                    Editar
                                </button>
                            )}
                        </div>

                        {(!workout.completed || isEditingFeedback) && !isCoach ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-2">Esforço percebido (0-10)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range" min="0" max="10"
                                            value={feedback.perception}
                                            onChange={(e) => setFeedback({ ...feedback, perception: parseInt(e.target.value) })}
                                            className="flex-1 accent-brand-primary"
                                        />
                                        <span className="text-lg font-black text-brand-primary w-6">{feedback.perception}</span>
                                    </div>
                                    <div className="flex justify-between text-[8px] text-zinc-400 mt-1 uppercase font-bold">
                                        <span>Muito Leve</span>
                                        <span>Máximo</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-2">Suas percepções</label>
                                    <textarea
                                        placeholder="Como você se sentiu hoje? Cuidou da hidratação? Alguma dor?"
                                        value={feedback.text}
                                        onChange={(e) => setFeedback({ ...feedback, text: e.target.value })}
                                        className="w-full h-32 rounded-2xl bg-zinc-50 dark:bg-zinc-800 p-4 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary transition-all resize-none"
                                    />
                                    {isEditingFeedback && (
                                        <button
                                            onClick={() => setIsEditingFeedback(false)}
                                            className="mt-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase"
                                        >
                                            Cancelar Edição
                                        </button>
                                    )}

                                    {/* Botão para Mobile - Fica embaixo do formulário */}
                                    <button
                                        onClick={handleSaveFeedback}
                                        disabled={savingFeedback}
                                        className="sm:hidden w-full mt-6 rounded-xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        <Send size={18} />
                                        {savingFeedback ? "Salvando..." : (workout.completed ? "Atualizar Feedback" : "Concluir Treino")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {workout.feedbackPerception !== undefined && workout.feedbackPerception !== null && (
                                    <div className="flex items-center gap-2">
                                        <Star size={16} className="text-brand-primary fill-brand-primary" />
                                        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                            Esforço: <span className="text-brand-primary">{workout.feedbackPerception}/10</span>
                                        </p>
                                    </div>
                                )}
                                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-600 dark:text-zinc-400 italic">
                                    {workout.feedbackText || (workout.completed ? "O feedback do aluno será exibido aqui em breve." : "Aguardando conclusão do treino pelo aluno.")}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
