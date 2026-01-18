"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
            </div>
        );
    }

    const menuSections = session?.user?.role === "COACH"
        ? [
            {
                title: "TREINAMENTO",
                items: [
                    { name: "Painel Treinador", href: "/dashboard", icon: "📊" },
                    { name: "Alunos", href: "/dashboard/alunos", icon: "👥" },
                    { name: "Planilhas", href: "/dashboard/planilhas", icon: "📝" },
                    { name: "Exercícios", href: "/dashboard/nutri/exercicios", icon: "🏋️‍♂️" },
                    { name: "Testes", href: "/dashboard/testes", icon: "🧪" },
                ]
            },
            {
                title: "NUTRIÇÃO",
                items: [
                    { name: "Pacientes", href: "/dashboard/nutri/pacientes", icon: "🍎" },
                    { name: "Planos Alimentares", href: "/dashboard/nutri/dietas", icon: "🍱" },
                    { name: "Avaliações", href: "/dashboard/nutri/avaliacoes", icon: "📏" },
                ]
            },
            {
                title: "SISTEMA",
                items: [
                    ...(session?.user?.email === 'nutricionista@evolunutri.com.br' ? [{ name: "Administração", href: "/dashboard/admin", icon: "⚙️" }] : []),
                    { name: "Perfil", href: "/dashboard/perfil", icon: "👤" },
                ]
            }
        ]
        : [
            {
                title: "MENU",
                items: [
                    { name: "Meu Painel", href: "/dashboard", icon: "🏠" },
                    { name: "Minha Dieta", href: "/dashboard/nutri/dietas", icon: "🍱" },
                    { name: "Meu Treino", href: "/dashboard/treinos", icon: "🏃" },
                    { name: "Minha Evolução", href: "/dashboard/evolucao", icon: "📈" },
                    { name: "Meu Perfil", href: "/dashboard/perfil", icon: "👤" },
                ]
            }
        ];

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-56 transform bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-zinc-900 lg:sticky lg:top-0 lg:h-screen lg:block lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center gap-2 px-6 py-6">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg premium-gradient text-white font-bold text-xs">
                            E
                        </div>
                        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                            EvoluNutri
                        </span>
                    </div>

                    <nav className="flex-1 space-y-6 px-4 overflow-y-auto">
                        {menuSections.map((section) => (
                            <div key={section.title} className="space-y-1">
                                <h3 className="px-4 text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                                    {section.title}
                                </h3>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-[13px] font-medium transition-all ${isActive
                                                    ? "premium-gradient text-white shadow-lg shadow-brand-primary/20"
                                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                                                    }`}
                                            >
                                                <span className="text-base">{item.icon}</span>
                                                {item.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                        <div className="mb-4 flex items-center gap-2.5 px-2">
                            <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-base font-bold text-zinc-400">
                                        {session?.user?.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold text-zinc-900 dark:text-white">
                                    {session?.user?.name || "Usuário"}
                                </p>
                                <p className="text-[9px] text-zinc-500 leading-none break-all">
                                    {session?.user?.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium text-red-600 transition-all hover:bg-red-50 dark:hover:bg-red-900/10"
                        >
                            <span className="text-base">🚪</span>
                            Sair
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-16 items-center justify-between border-b border-zinc-100 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg premium-gradient text-white font-bold">
                            E
                        </div>
                        <span className="text-lg font-bold tracking-tight">EvoluNutri</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                        {isSidebarOpen ? "✕" : "☰"}
                    </button>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:px-8 lg:py-8">
                    <div className="w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
