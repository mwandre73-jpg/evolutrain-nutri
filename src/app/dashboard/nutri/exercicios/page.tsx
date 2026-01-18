"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Play, Trash2, Edit2, X, Dumbbell, Loader2, Video, Image as ImageIcon } from "lucide-react";
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
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        muscles: "",
        videoUrl: "",
        thumbnailUrl: "",
        instructions: ""
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

    const handleUpload = (type: 'video' | 'image') => {
        if (!(window as any).cloudinary) return;

        (window as any).cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            resourceType: type,
            sources: ['local', 'camera'],
            multiple: false,
            clientAllowedFormats: type === 'video' ? ['mp4', 'mov', 'webm'] : ['jpg', 'png', 'webp', 'jpeg'],
            maxFileSize: type === 'video' ? 50000000 : 5000000,
            styles: {
                palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#10B981",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#10B981",
                    action: "#10B981",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1"
                }
            }
        }, (error: any, result: any) => {
            if (!error && result && result.event === "success") {
                if (type === 'video') {
                    setFormData(prev => ({ ...prev, videoUrl: result.info.secure_url }));
                } else {
                    setFormData(prev => ({ ...prev, thumbnailUrl: result.info.secure_url }));
                }
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
        setFormData({ name: "", muscles: "", videoUrl: "", thumbnailUrl: "", instructions: "" });
        setEditingId(null);
    };

    const handleEdit = (ex: any) => {
        setFormData({
            name: ex.name,
            muscles: ex.muscles || "",
            videoUrl: ex.videoUrl || "",
            thumbnailUrl: ex.thumbnailUrl || "",
            instructions: ex.instructions || ""
        });
        setEditingId(ex.id);
        setIsModalOpen(true);
    };

    const getThumbnail = (ex: any) => {
        if (ex.thumbnailUrl) return ex.thumbnailUrl;
        if (ex.videoUrl?.includes("cloudinary.com")) {
            return ex.videoUrl.replace(/\.[^/.]+$/, ".jpg");
        }
        return null;
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                            Biblioteca de <span className="text-gradient">Exercícios</span>
                        </h1>
                        <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                        {filteredExercises.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-zinc-500 bg-white rounded-3xl border-2 border-dashed border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                                <Dumbbell className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                                <p className="font-bold">Nenhum exercício encontrado.</p>
                                <p className="text-sm mt-1">Comece adicionando exercícios com vídeos HD.</p>
                            </div>
                        ) : (
                            filteredExercises.map((ex) => (
                                <div
                                    key={ex.id}
                                    className="group relative aspect-square rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 transition-all hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 flex flex-col"
                                    onMouseEnter={() => setHoveredId(ex.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <div className="aspect-[4/3] w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative mb-auto shadow-inner">
                                        {ex.videoUrl ? (
                                            <>
                                                {hoveredId === ex.id ? (
                                                    <video
                                                        src={ex.videoUrl}
                                                        className="h-full w-full object-cover object-top animate-fade-in"
                                                        autoPlay
                                                        muted
                                                        loop
                                                        playsInline
                                                    />
                                                ) : (
                                                    <div className="h-full w-full relative">
                                                        {getThumbnail(ex) ? (
                                                            <img
                                                                src={getThumbnail(ex)}
                                                                alt={ex.name}
                                                                className="h-full w-full object-cover object-top"
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800">
                                                                <Play className="text-zinc-300" size={24} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-full shadow-lg border border-white/30">
                                                                <Play className="text-white fill-white ml-0.5" size={18} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-zinc-400">
                                                <Play size={24} />
                                            </div>
                                        )}
                                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(ex)}
                                                className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-brand-primary shadow-lg"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ex.id, ex.name)}
                                                className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-red-500 shadow-lg"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight line-clamp-2">{ex.name}</h3>
                                        <p className="text-[8px] text-zinc-400 uppercase font-black tracking-wider mt-0.5">
                                            {ex.muscles || "Geral"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] bg-white p-8 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 animate-slide-up custom-scrollbar">
                        <header className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mb-1">Editor de Exercícios</p>
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{editingId ? "Editar Exercício" : "Novo Exercício"}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-2xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                <X size={24} />
                            </button>
                        </header>

                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Identificação</label>
                                    <input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-5 py-4 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 outline-none font-bold"
                                        placeholder="Abdominal máquina"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Grupamento Muscular</label>
                                    <input
                                        value={formData.muscles}
                                        onChange={(e) => setFormData({ ...formData, muscles: e.target.value })}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-5 py-4 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 outline-none font-bold"
                                        placeholder="Core"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Técnica de Execução</label>
                                <textarea
                                    value={formData.instructions}
                                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                    className="w-full h-32 rounded-2xl bg-zinc-50 border-none px-5 py-4 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 outline-none font-bold resize-none"
                                    placeholder="Nível: Básico&#10;Equipamento: Máquina&#10;Músculos: Reto abdominal&#10;Técnica: Evitar puxar pescoço"
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Mídia Demonstrativa</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em] text-zinc-400">Vídeo (Recomendado)</label>
                                        <div
                                            onClick={() => handleUpload('video')}
                                            className="w-full aspect-video rounded-3xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 group hover:border-brand-primary transition-all cursor-pointer overflow-hidden relative"
                                        >
                                            {formData.videoUrl ? (
                                                <>
                                                    <video src={formData.videoUrl} className="h-full w-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <p className="text-white text-[10px] font-black uppercase">Alterar Vídeo</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Video className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={32} />
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase">Upload Vídeo</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em] text-zinc-400">Capa / Imagem</label>
                                        <div
                                            onClick={() => handleUpload('image')}
                                            className="w-full aspect-video rounded-3xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 group hover:border-brand-primary transition-all cursor-pointer overflow-hidden relative"
                                        >
                                            {formData.thumbnailUrl ? (
                                                <>
                                                    <img src={formData.thumbnailUrl} className="h-full w-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <p className="text-white text-[10px] font-black uppercase">Alterar Capa</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={32} />
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase">Upload Capa</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full rounded-2xl bg-[#3B82F6] hover:bg-brand-primary py-5 font-black text-white shadow-xl transition-all hover:scale-[1.01] active:scale-95 mt-4 disabled:opacity-50 text-sm uppercase tracking-widest"
                            >
                                {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="afterInteractive" />
        </>
    );
}
