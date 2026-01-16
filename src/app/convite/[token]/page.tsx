"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { acceptInviteAction } from "@/app/actions/athletes";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
    const { token } = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleAccept = async () => {
        if (!session) {
            signIn(undefined, { callbackUrl: window.location.href });
            return;
        }

        setLoading(true);
        setError("");

        const result = await acceptInviteAction(token as string);

        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error || "Ocorreu um erro ao aceitar o convite.");
        }
        setLoading(false);
    };

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950 overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 -z-10 h-full w-full opacity-20 dark:opacity-10">
                <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-primary blur-[128px]" />
                <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-brand-secondary blur-[128px]" />
            </div>

            <div className="w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl premium-gradient text-white font-extrabold text-2xl shadow-xl mb-6">
                        E
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                        Evolu<span className="text-gradient">train</span>
                    </h1>
                </div>

                <div className="rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                    {success ? (
                        <div className="text-center space-y-6 animate-fade-in py-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Conta confirmada!</h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed px-4">
                                    Sua conta foi vinculada com sucesso. Bem-vindo à assessoria! Agora você já pode acompanhar seus treinos e evolução.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Acessar meu Painel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Convite Especial</h2>
                                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                                    Seu nutricionista convidou você para fazer parte da assessoria na EvoluNutri.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <button
                                    onClick={handleAccept}
                                    disabled={loading}
                                    className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Processando...
                                        </>
                                    ) : session ? (
                                        "Aceitar Convite"
                                    ) : (
                                        "Entrar e Aceitar"
                                    )}
                                </button>

                                {!session && (
                                    <p className="text-center text-xs text-zinc-500">
                                        Você precisará fazer login ou criar uma conta para continuar.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    © 2026 EvoluNutri. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
}
