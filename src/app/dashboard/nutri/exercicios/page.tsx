"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Play, Trash2, Edit2, X, Dumbbell, Loader2, Video } from "lucide-react";
import { getExercisesAction, saveExerciseAction, deleteExerciseAction } from "@/app/actions/exercises";
import Script from "next/script";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/lib/cloudinary";

export default function ExerciseLibraryPage() {
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        muscles: "",
        videoUrl: ""
    });

    useEffect(() => {
        loadExercises();
    }, []);

    const loadExercises = async () => {
        setLoading(true);
        const data = await getExercisesAction();
        setExercises(data);
        setLoading(false);
    };

    const handleVideoUpload = () => {
        if (!(window as any).cloudinary) return;

        (window as any).cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            resourceType: 'video',
            sources: ['local', 'camera'],
            multiple: false,
            clientAllowedFormats: ['mp4', 'mov', 'webm'],
            maxFileSize: 50000000, // 50MB
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#F26522",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#F26522",
                    action: "#FF620C",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        }, (error: any, result: any) => {
            if (!error && result && result.event === "success") {
                setFormData(prev => ({
                    ...prev,
                    videoUrl: result.info.secure_url
                }));
            }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return alert("Nome é obrigatório");

        setIsSaving(true);
        const result = await saveExerciseAction({
            ...formData,
            id: editingId || undefined
        });

        if (result.success) {
            await loadExercises();
            setIsModalOpen(false);
            resetForm();
        } else {
            alert("Erro ao salvar: " + result.error);
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Excluir o exercício "${name}"?`)) return;
        const result = await deleteExerciseAction(id);
        if (result.success) {
            await loadExercises();
        } else {
            alert("Erro ao excluir: " + result.error);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", muscles: "", videoUrl: "" });
        setEditingId(null);
    };

    const handleEdit = (ex: any) => {
        setFormData({
            name: ex.name,
            muscles: ex.muscles || "",
            videoUrl: ex.videoUrl || ""
        });
        setEditingId(ex.id);
        setIsModalOpen(true);
    };

    const filteredExercises = exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.muscles?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="space-y-8 animate-slide-up">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                            Biblioteca de <span className="text-gradient">Exercícios</span>
                        </h1>
                        <p className="mt-2 text-zinc-600 dark:text-zinc-400 font-medium">
                            Demonstrações em vídeo com loop infinito para seus atletas.
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="rounded-2xl premium-gradient px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="inline-block mr-2" size={18} /> Novo Exercício
                    </button>
                </header>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou grupamento muscular..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white border border-zinc-200 shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all dark:bg-zinc-900 dark:border-zinc-800"
                    />
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-brand-primary h-12 w-12" />
                        <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Carregando Biblioteca...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {filteredExercises.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-zinc-500 bg-white rounded-3xl border-2 border-dashed border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                                <Dumbbell className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                                <p className="font-bold">Nenhum exercício encontrado.</p>
                                <p className="text-sm mt-1">Comece adicionando exercícios com vídeos HD.</p>
                            </div>
                        ) : (
                            filteredExercises.map((ex) => (
                                <div key={ex.id} className="group relative rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800">
                                    <div className="aspect-video w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative mb-4">
                                        {ex.videoUrl ? (
                                            <video
                                                src={ex.videoUrl}
                                                className="h-full w-full object-cover"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-zinc-400">
                                                <Play size={32} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(ex)}
                                                className="p-2 bg-white/90 dark:bg-zinc-800/90 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-brand-primary"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ex.id, ex.name)}
                                                className="p-2 bg-white/90 dark:bg-zinc-800/90 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{ex.name}</h3>
                                    <p className="text-xs text-zinc-500 uppercase font-black tracking-wider text-brand-primary">
                                        {ex.muscles || "Geral"}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-slide-up">
                            <header className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold">{editingId ? "Editar Exercício" : "Novo Exercício"}</h2>
                                    <p className="text-xs text-zinc-500 font-medium">Demonstração visual para o treino</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                    <X size={24} />
                                </button>
                            </header>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase ml-1">Nome do Exercício</label>
                                    <input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3.5 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 outline-none font-bold"
                                        placeholder="Ex: Agachamento Livre"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase ml-1">Músculos / Grupamento</label>
                                    <input
                                        value={formData.muscles}
                                        onChange={(e) => setFormData({ ...formData, muscles: e.target.value })}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3.5 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 outline-none font-bold"
                                        placeholder="Ex: Quadríceps, Glúteos"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-400 uppercase ml-1">Vídeo Demonstrativo</label>
                                    <div
                                        onClick={handleVideoUpload}
                                        className="w-full aspect-video rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 group hover:border-brand-primary transition-all cursor-pointer overflow-hidden relative"
                                    >
                                        {formData.videoUrl ? (
                                            <>
                                                <video src={formData.videoUrl} className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-white text-xs font-black uppercase">Alterar Vídeo</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Video className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={48} />
                                                <div className="text-center">
                                                    <p className="text-xs font-black text-zinc-500 uppercase">Clique para Upload HD</p>
                                                    <p className="text-[10px] text-zinc-400 mt-1">MP4, MOV ou WebM (Max 50MB)</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full rounded-2xl premium-gradient py-4 font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 mt-4 disabled:opacity-50"
                                >
                                    {isSaving ? "SALVANDO..." : editingId ? "ATUALIZAR EXERCÍCIO" : "SALVAR EXERCÍCIO"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="afterInteractive" />
        </>
    );
}
