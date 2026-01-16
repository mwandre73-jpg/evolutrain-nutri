"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllAthletesAction, createInviteAction, exportAthletesDataAction, deleteAthleteAction } from "@/app/actions/athletes";
import { Copy, Check, X, Download, FileSpreadsheet, Search, Trash2 } from "lucide-react";

interface Aluno {
    id: string;
    name: string;
    vo2: number;
    status: string;
    lastTest: string;
}

export default function AlunosPage() {
    const router = useRouter();
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteName, setInviteName] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [generatedLink, setGeneratedLink] = useState("");
    const [isCopying, setIsCopying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const load = async () => {
            const data = await getAllAthletesAction();
            if (data.length > 0) {
                setAlunos(data);
            } else {
                setAlunos([]);
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(alunos.map(a => a.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredAlunos = alunos.filter(aluno =>
        aluno.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = async () => {
        if (selectedIds.length === 0) return;
        setIsExporting(true);
        try {
            const csvData = await exportAthletesDataAction(selectedIds);
            if (csvData) {
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `exportacao_alunos_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error("Export failed:", error);
        }
        setIsExporting(false);
    };

    const handleDeleteAthlete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (!window.confirm(`Tem certeza que deseja excluir o aluno ${name}? Todos os seus treinos, métricas e histórico serão removidos permanentemente.`)) {
            return;
        }

        const result = await deleteAthleteAction(id);
        if (result.success) {
            const newData = await getAllAthletesAction();
            setAlunos(newData);
        } else {
            alert(result.error || "Erro ao excluir aluno.");
        }
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Gestão de <span className="text-gradient">Alunos</span>
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Acompanhe o desempenho e evolução de sua assessoria.
                    </p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 rounded-2xl bg-white border border-zinc-200 px-6 py-3 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-95 disabled:opacity-50"
                        >
                            <FileSpreadsheet size={18} className="text-emerald-600" />
                            {isExporting ? "Exportando..." : `Exportar (${selectedIds.length})`}
                        </button>
                    )}
                    <div className="flex flex-col items-end gap-1">
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="rounded-2xl premium-gradient px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                            + Convidar Aluno
                        </button>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase mr-2">
                            Uso: {alunos.length}/10 atletas
                        </span>
                    </div>
                </div>
            </header>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar aluno pelo nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-zinc-200 shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800"
                />
            </div>

            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-zinc-500">Carregando alunos...</div>
                ) : filteredAlunos.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        {searchTerm ? "Nenhum aluno encontrado com este nome." : "Nenhum aluno cadastrado."}
                    </div>
                ) : (
                    <>
                        {/* Mobile view: Cards */}
                        <div className="grid gap-4 p-4 sm:hidden">
                            {filteredAlunos.map((aluno: any) => (
                                <div
                                    key={aluno.id}
                                    onClick={() => router.push(`/dashboard/alunos/${aluno.id}`)}
                                    className="relative flex flex-col p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                                {aluno.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-zinc-900 dark:text-white">{aluno.name}</h3>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold mt-1 uppercase ${aluno.status === 'Pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                    {aluno.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-2 -mr-2">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary w-5 h-5"
                                                checked={selectedIds.includes(aluno.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => handleSelectOne(aluno.id)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase">Última Métrica</p>
                                            <div className="flex items-center gap-2">
                                                {aluno.lastMetric ? (
                                                    <>
                                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400`}>
                                                            {aluno.lastMetric.category === 'STRENGTH' ? 'FORÇA' :
                                                                aluno.lastMetric.category === 'SPEED' ? 'VELO' :
                                                                    aluno.lastMetric.category === 'RACE' ? 'PROVA' : 'AERO'}
                                                        </span>
                                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                            {aluno.lastMetric.category === 'AEROBIC' && aluno.vo2 > 0 ? (
                                                                `${aluno.vo2.toFixed(1)}`
                                                            ) : (
                                                                aluno.lastMetric.result
                                                            )}
                                                            {aluno.lastMetric.category === 'STRENGTH' ? 'kg' :
                                                                aluno.lastMetric.category === 'SPEED' ? 's' :
                                                                    aluno.lastMetric.category === 'AEROBIC' ? ' ml' : ''}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-zinc-400">--</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase">Último Teste</p>
                                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{aluno.lastTest || "--"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                        <span className="text-xs font-bold text-brand-primary">Ver Perfil Completo →</span>
                                        <button
                                            onClick={(e) => handleDeleteAthlete(e, aluno.id, aluno.name)}
                                            className="text-zinc-400 hover:text-red-500 transition-colors p-2"
                                            title="Excluir Aluno"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop view: Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                                    <tr>
                                        <th className="px-6 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                                                checked={selectedIds.length === filteredAlunos.length && filteredAlunos.length > 0}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4">Nome</th>
                                        <th className="px-6 py-4">Última Métrica</th>
                                        <th className="px-6 py-4">Último Teste</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {filteredAlunos.map((aluno: any) => (
                                        <tr
                                            key={aluno.id}
                                            className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${selectedIds.includes(aluno.id) ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-4 h-4"
                                                    checked={selectedIds.includes(aluno.id)}
                                                    onChange={() => handleSelectOne(aluno.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                                                {aluno.name}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    {aluno.lastMetric ? (
                                                        <>
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${aluno.lastMetric.category === 'STRENGTH' ? 'bg-orange-100 text-orange-700' :
                                                                aluno.lastMetric.category === 'SPEED' ? 'bg-blue-100 text-blue-700' :
                                                                    aluno.lastMetric.category === 'RACE' ? 'bg-purple-100 text-purple-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                {aluno.lastMetric.category === 'STRENGTH' ? 'Força' :
                                                                    aluno.lastMetric.category === 'SPEED' ? 'Velo' :
                                                                        aluno.lastMetric.category === 'RACE' ? 'Prova' : 'Aero'
                                                                }
                                                            </span>
                                                            <span className="font-bold text-zinc-900 dark:text-white">
                                                                {aluno.lastMetric.category === 'AEROBIC' && aluno.vo2 > 0 ? (
                                                                    `${aluno.vo2.toFixed(1)} ml/kg`
                                                                ) : aluno.lastMetric.category === 'RACE' ? (
                                                                    (() => {
                                                                        const s = aluno.lastMetric.result;
                                                                        const h = Math.floor(s / 3600);
                                                                        const min = Math.floor((s % 3600) / 60);
                                                                        const sec = Math.round(s % 60);
                                                                        return `${h > 0 ? h + 'h ' : ''}${min}m ${sec}s`;
                                                                    })()
                                                                ) : (
                                                                    `${aluno.lastMetric.result}${aluno.lastMetric.category === 'STRENGTH' ? ' kg' :
                                                                        aluno.lastMetric.category === 'SPEED' ? ' s' : ' m'
                                                                    }`
                                                                )}
                                                            </span>
                                                        </>
                                                    ) : "--"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                                                {aluno.lastTest || "--"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-tighter ${aluno.status === 'Pendente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                    {aluno.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Link
                                                        href={`/dashboard/alunos/${aluno.id}`}
                                                        className="text-brand-primary font-bold hover:underline"
                                                    >
                                                        Ver Perfil
                                                    </Link>
                                                    <button
                                                        onClick={(e) => handleDeleteAthlete(e, aluno.id, aluno.name)}
                                                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                        title="Excluir Aluno"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Convite */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-slide-up">
                        <button
                            onClick={() => {
                                setIsInviteModalOpen(false);
                                setGeneratedLink("");
                                setInviteName("");
                                setInviteEmail("");
                            }}
                            className="absolute right-6 top-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Convidar Aluno</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                            Cadastre o nome do aluno para gerar um link exclusivo de acesso.
                        </p>

                        {!generatedLink ? (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    setIsGenerating(true);
                                    const result = await createInviteAction(inviteName, inviteEmail);
                                    if (result.success && result.inviteLink) {
                                        setGeneratedLink(result.inviteLink);
                                        // Recarrega a lista para mostrar o pendente
                                        const newData = await getAllAthletesAction();
                                        setAlunos(newData);
                                    } else {
                                        alert(result.error || "Erro ao gerar convite.");
                                    }
                                    setIsGenerating(false);
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Nome do Aluno</label>
                                    <input
                                        type="text"
                                        required
                                        value={inviteName}
                                        onChange={(e) => setInviteName(e.target.value)}
                                        placeholder="Ex: João Silva"
                                        className="w-full rounded-2xl bg-zinc-50 px-4 py-3.5 text-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary outline-none dark:bg-zinc-800 dark:ring-zinc-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1.5 ml-1">Email (Opcional)</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="aluno@email.com"
                                        className="w-full rounded-2xl bg-zinc-50 px-4 py-3.5 text-sm ring-1 ring-zinc-200 focus:ring-2 focus:ring-brand-primary outline-none dark:bg-zinc-800 dark:ring-zinc-700"
                                    />
                                </div>
                                <button
                                    disabled={isGenerating}
                                    className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                                >
                                    {isGenerating ? "Gerando..." : "Gerar Link de Acesso"}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50">
                                    <p className="text-emerald-800 dark:text-emerald-400 text-sm font-medium text-center">
                                        Link gerado com sucesso! Compartilhe com o aluno.
                                    </p>
                                </div>

                                <div className="relative">
                                    <input
                                        readOnly
                                        value={generatedLink}
                                        className="w-full rounded-2xl bg-zinc-50 pl-4 pr-12 py-4 text-xs font-mono ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedLink);
                                            setIsCopying(true);
                                            setTimeout(() => setIsCopying(false), 2000);
                                        }}
                                        className="absolute right-3 top-2.5 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition-colors"
                                    >
                                        {isCopying ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-zinc-500" />}
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const message = `Olá ${inviteName}! Aqui está seu link de acesso para a EvoluNutri: ${generatedLink}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white transition-all hover:bg-opacity-90"
                                    >
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            window.location.href = `mailto:${inviteEmail}?subject=Convite EvoluNutri&body=Olá ${inviteName}! Acesse a EvoluNutri pelo link: ${generatedLink}`;
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                                    >
                                        E-mail
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
