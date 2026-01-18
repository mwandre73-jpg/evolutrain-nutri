"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getAllCoachesAction, createCoachAction, deleteCoachAction } from "@/app/actions/user";
import { UserPlus, Mail, User, ShieldCheck, X, Check, Loader2, Trash2 } from "lucide-react";

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [coaches, setCoaches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (status === "unauthenticated" || (session?.user?.email !== 'nutricionista@evolunutri.com.br')) {
            router.push("/dashboard");
            return;
        }

        const load = async () => {
            const data = await getAllCoachesAction();
            setCoaches(data);
            setLoading(false);
        };

        if (session?.user?.email === 'nutricionista@evolunutri.com.br') {
            load();
        }
    }, [session, status, router]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        const result = await createCoachAction(name, email);

        if (result.success) {
            setMessage({ type: 'success', text: "Treinador cadastrado com sucesso!" });
            setName("");
            setEmail("");
            const updated = await getAllCoachesAction();
            setCoaches(updated);
            setTimeout(() => setIsModalOpen(false), 2000);
        } else {
            setMessage({ type: 'error', text: result.error || "Erro ao cadastrar treinador." });
        }
        setIsSaving(false);
    };

    const handleDeleteCoach = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir o treinador ${name}? Todos os seus alunos e dados serão removidos permanentemente.`)) {
            return;
        }

        const result = await deleteCoachAction(id);
        if (result.success) {
            setMessage({ type: 'success', text: "Treinador excluído com sucesso!" });
            const data = await getAllCoachesAction();
            setCoaches(data);
        } else {
            setMessage({ type: 'error', text: result.error || "Erro ao excluir treinador." });
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-slide-up">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                            Painel <span className="text-gradient">Administrativo</span>
                        </h1>
                        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Gestão de nutricionistas da plataforma EvoluNutri.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-2xl premium-gradient px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <UserPlus size={18} />
                        Novo Treinador
                    </button>
                </header>

                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Treinador</th>
                                    <th className="px-6 py-4">E-mail</th>
                                    <th className="px-6 py-4">Status / Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {coaches.map((coach) => (
                                    <tr key={coach.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                    {coach.image ? (
                                                        <img src={coach.image} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-400">
                                                            {coach.name?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-zinc-900 dark:text-white">{coach.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{coach.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    <ShieldCheck size={12} />
                                                    Ativo
                                                </span>
                                                {coach.email !== 'nutricionista@evolunutri.com.br' && (
                                                    <button
                                                        onClick={() => handleDeleteCoach(coach.id, coach.name)}
                                                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                        title="Excluir Treinador"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in transition-all">
                    <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-slide-up custom-scrollbar">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Novo Treinador</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-6 font-medium">
                            Cadastre um novo treinador. Senha padrão: <span className="font-bold text-brand-primary">123456</span>
                        </p>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 ml-1">
                                    <User size={14} />
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Pedro Fonseca"
                                    className="w-full rounded-2xl bg-zinc-50 px-4 py-3.5 text-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary outline-none dark:bg-zinc-800 dark:ring-zinc-700 shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 ml-1">
                                    <Mail size={14} />
                                    E-mail de Acesso
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="treinador@email.com"
                                    className="w-full rounded-2xl bg-zinc-50 px-4 py-3.5 text-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary outline-none dark:bg-zinc-800 dark:ring-zinc-700 shadow-sm"
                                />
                            </div>

                            {message && (
                                <div className={`rounded-2xl p-4 flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    } animate-shake`}>
                                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                                    <span className="text-sm font-medium">{message.text}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cadastrar Treinador"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
