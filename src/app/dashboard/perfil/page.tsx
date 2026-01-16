"use client";

import { useSession } from "next-auth/react";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { updateProfileAction, updatePasswordAction } from "@/app/actions/user";
import { getMyAthleteProfileIdAction } from "@/app/actions/athletes";
import { getCoachSelfWorkoutsAction } from "@/app/actions/workouts";
import { Activity, Dumbbell, Trophy, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";

export default function PerfilPage() {
    const { data: session, update } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(session?.user?.name || "");
    const [myAthleteId, setMyAthleteId] = useState<string | null>(null);
    const [myWorkouts, setMyWorkouts] = useState<any[]>([]);

    // Password State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    useEffect(() => {
        if (session?.user?.role === "COACH") {
            const loadData = async () => {
                const id = await getMyAthleteProfileIdAction();
                setMyAthleteId(id);
                const workouts = await getCoachSelfWorkoutsAction();
                setMyWorkouts(workouts);
            };
            loadData();
        }
    }, [session]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        formData.append("name", name);
        if (fileInputRef.current?.files?.[0]) {
            formData.append("image", fileInputRef.current.files[0]);
        }

        const res = await updateProfileAction(formData);

        if (res.success) {
            setIsSaving(false);
            // Atualizar sessão (NextAuth)
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name: name,
                    image: res.user?.image
                }
            });
            alert("Perfil atualizado com sucesso!");
            window.location.reload(); // Forçar recarregamento para garantir que todos os componentes vejam a mudança
        } else {
            alert(res.error || "Erro ao salvar alterações");
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("As novas senhas não coincidem");
            return;
        }
        if (newPassword.length < 6) {
            alert("A nova senha deve ter pelo menos 6 caracteres");
            return;
        }

        setIsUpdatingPassword(true);
        const formData = new FormData();
        formData.append("currentPassword", currentPassword);
        formData.append("newPassword", newPassword);

        const res = await updatePasswordAction(formData);
        if (res.success) {
            alert("Senha atualizada com sucesso!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } else {
            alert(res.error || "Erro ao atualizar senha");
        }
        setIsUpdatingPassword(false);
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <header>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                    Meu <span className="text-gradient">Perfil</span>
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    Gerencie suas informações pessoais e preferências de conta.
                </p>
            </header>

            <div className="max-w-2xl">
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800">
                        <div
                            className="group relative h-24 w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-800"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl || session?.user?.image ? (
                                <img src={previewUrl || session?.user?.image || ""} alt="" className="h-full w-full object-cover transition-all group-hover:scale-110 group-hover:opacity-50" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-400 group-hover:opacity-50">
                                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white bg-black/50 px-2 py-1 rounded-lg">Mudar Foto</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                {session?.user?.name || "Usuário"}
                            </h2>
                            <p className="text-zinc-500">{session?.user?.email}</p>

                            {session?.user?.role === "COACH" && myAthleteId && (
                                <Link
                                    href={`/dashboard/alunos/${myAthleteId}`}
                                    className="mt-4 flex items-center gap-2 w-fit rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all active:scale-95"
                                >
                                    <Activity className="w-4 h-4" />
                                    Minhas Métricas de Atleta
                                </Link>
                            )}
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSave}>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    E-mail
                                </label>
                                <input
                                    type="email"
                                    defaultValue={session?.user?.email || ""}
                                    disabled
                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-xl premium-gradient px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Seção de Segurança / Troca de Senha */}
                <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-primary/10 rounded-xl">
                            <ShieldCheck className="w-5 h-5 text-brand-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Segurança</h3>
                    </div>

                    <form className="space-y-6" onSubmit={handleUpdatePassword}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Senha Atual
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950 pr-12"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Nova Senha
                                    </label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Confirmar Nova Senha
                                    </label>
                                    <input
                                        type={showPasswords ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary dark:border-zinc-800 dark:bg-zinc-950"
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isUpdatingPassword}
                                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                            >
                                <Lock className="w-4 h-4" />
                                {isUpdatingPassword ? "Atualizando..." : "Alterar Senha"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Seção de Treinos Próprios */}
                {session?.user?.role === "COACH" && myWorkouts.length > 0 && (
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-brand-primary/10 rounded-xl">
                                <Trophy className="w-5 h-5 text-brand-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Meus Próximos Treinos</h3>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {myWorkouts.map((w) => (
                                <Link
                                    key={w.id}
                                    href={`/dashboard/planilhas/${w.id}`}
                                    className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-brand-primary/30 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase">{w.date}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${w.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {w.completed ? 'Concluído' : 'Pendente'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        {w.type === 'Corrida' ? <Activity className="w-4 h-4 text-brand-primary" /> : <Dumbbell className="w-4 h-4 text-brand-secondary" />}
                                        {w.type}
                                    </h4>
                                    <p className="mt-1 text-sm text-zinc-500 line-clamp-1">{w.intensity}</p>
                                </Link>
                            ))}
                        </div>

                        <Link
                            href={`/dashboard/alunos/${myAthleteId}`}
                            className="mt-6 block text-center text-xs font-bold text-brand-primary hover:underline uppercase tracking-wider"
                        >
                            Ver Histórico Completo →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
