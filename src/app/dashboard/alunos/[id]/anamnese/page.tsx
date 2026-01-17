"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAthleteAction } from "@/app/actions/athletes";
import { saveAnamneseAction, getAnamneseHistoryAction, deleteAnamneseAction } from "@/app/actions/anamnesis";
import { calcularIMC, calcularDensidadePollock3Homens, calcularDensidadePollock7Homens, calcularDensidadePollock3Mulheres, calcularDensidadePollock7Mulheres, calcularPercentualGorduraSiri } from "@/lib/calculos";
import { Plus, Trash2, ChevronLeft, Save, Scale, Ruler, Activity, History, Download, FileText, Camera, Image as ImageIcon, Eye, ArrowRightLeft, X, Maximize2 } from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Script from "next/script";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/lib/cloudinary";

export default function AnamnesePage() {
    const { id } = useParams();
    const router = useRouter();
    const [athlete, setAthlete] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);

    const INITIAL_FORM_DATA = {
        id: "",
        weight: "",
        height: "",
        date: new Date().toISOString().split('T')[0],
        chest: "", waist: "", abdomen: "", hip: "",
        armR: "", armL: "", forearmR: "", forearmL: "",
        thighR: "", thighL: "", calfR: "", calfL: "",
        triceps: "", subscapular: "", chest_fold: "",
        axilla: "", suprailiac: "", abdominal_fold: "", thigh_fold: "",
        method: "POLLOCK_7",
        photoFrontUrl: "",
        photoSideUrl: "",
        photoBackUrl: "",
        photoNotes: ""
    };

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    const [results, setResults] = useState({
        bmi: 0,
        bodyFat: 0,
        fatMass: 0,
        leanMass: 0
    });

    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        const load = async () => {
            const [aData, hData] = await Promise.all([
                getAthleteAction(id as string),
                getAnamneseHistoryAction(id as string)
            ]);
            setAthlete(aData);
            setHistory(hData);
            if (aData) {
                const a = aData as any;
                setFormData(prev => ({
                    ...prev,
                    weight: a.peso?.toString() || "",
                    height: a.altura?.toString() || ""
                }));
            }
            setLoading(false);
        };
        load();
    }, [id]);

    useEffect(() => {
        const w = parseFloat(formData.weight);
        const h = parseFloat(formData.height);
        const age = athlete?.idade || 30;
        const gender = athlete?.gender || "M";

        let bmi = 0;
        let bf = 0;

        if (w > 0 && h > 0) {
            bmi = calcularIMC(w, h);
        }

        const folds = {
            t: parseFloat(formData.triceps) || 0,
            s: parseFloat(formData.subscapular) || 0,
            c: parseFloat(formData.chest_fold) || 0,
            a: parseFloat(formData.axilla) || 0,
            si: parseFloat(formData.suprailiac) || 0,
            ab: parseFloat(formData.abdominal_fold) || 0,
            th: parseFloat(formData.thigh_fold) || 0,
        };

        if (formData.method === "POLLOCK_7") {
            const soma = folds.t + folds.s + folds.c + folds.a + folds.si + folds.ab + folds.th;
            if (soma > 0) {
                const dens = gender === "F"
                    ? calcularDensidadePollock7Mulheres(soma, age)
                    : calcularDensidadePollock7Homens(soma, age);
                bf = calcularPercentualGorduraSiri(dens);
            }
        } else {
            const soma = gender === "F"
                ? folds.t + folds.si + folds.th
                : folds.c + folds.ab + folds.th;

            if (soma > 0) {
                const dens = gender === "F"
                    ? calcularDensidadePollock3Mulheres(soma, age)
                    : calcularDensidadePollock3Homens(soma, age);
                bf = calcularPercentualGorduraSiri(dens);
            }
        }

        const fatMass = (w * bf) / 100;
        const leanMass = w - fatMass;

        setResults({ bmi, bodyFat: bf, fatMass, leanMass });
    }, [formData, athlete]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = (fieldName: string) => {
        if (!(window as any).cloudinary) return;

        (window as any).cloudinary.openUploadWidget({
            cloudName: CLOUDINARY_CLOUD_NAME,
            uploadPreset: CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'camera'],
            multiple: false,
            cropping: false,
            clientAllowedFormats: ['jpg', 'png', 'jpeg'],
            maxImageFileSize: 10000000,
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
                const optimizedUrl = result.info.secure_url.replace('/upload/', '/upload/e_sharpen:100,q_auto:best/');
                setFormData(prev => ({
                    ...prev,
                    [fieldName]: optimizedUrl
                }));
            }
        });
    };

    const handleLoadEvaluation = (evalData: any) => {
        setFormData({
            id: evalData.id,
            weight: evalData.weight?.toString() || "",
            height: evalData.height?.toString() || "",
            date: evalData.date || new Date().toISOString().split('T')[0],
            chest: evalData.chest?.toString() || "",
            waist: evalData.waist?.toString() || "",
            abdomen: evalData.abdomen?.toString() || "",
            hip: evalData.hip?.toString() || "",
            armR: evalData.armR?.toString() || "",
            armL: evalData.armL?.toString() || "",
            forearmR: evalData.forearmR?.toString() || "",
            forearmL: evalData.forearmL?.toString() || "",
            thighR: evalData.thighR?.toString() || "",
            thighL: evalData.thighL?.toString() || "",
            calfR: evalData.calfR?.toString() || "",
            calfL: evalData.calfL?.toString() || "",
            triceps: evalData.triceps?.toString() || "",
            subscapular: evalData.subscapular?.toString() || "",
            chest_fold: evalData.chest_fold?.toString() || "",
            axilla: evalData.axilla?.toString() || "",
            suprailiac: evalData.suprailiac?.toString() || "",
            abdominal_fold: evalData.abdominal_fold?.toString() || "",
            thigh_fold: evalData.thigh_fold?.toString() || "",
            method: evalData.method || "POLLOCK_7",
            photoFrontUrl: evalData.photoFrontUrl || "",
            photoSideUrl: evalData.photoSideUrl || "",
            photoBackUrl: evalData.photoBackUrl || "",
            photoNotes: evalData.photoNotes || ""
        });
    };

    const handleNewEvaluation = () => {
        setFormData({
            ...INITIAL_FORM_DATA,
            weight: athlete?.peso?.toString() || "",
            height: athlete?.altura?.toString() || ""
        });
    };

    const toggleComparison = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedForComparison(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(-2)
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        const { id: evaluationId, ...restOfFormData } = formData;
        const submitData = {
            id: evaluationId || undefined,
            athleteProfileId: id as string,
            ...restOfFormData,
            weight: parseFloat(formData.weight),
            height: parseFloat(formData.height),
            chest: parseFloat(formData.chest) || null,
            waist: parseFloat(formData.waist) || null,
            abdomen: parseFloat(formData.abdomen) || null,
            hip: parseFloat(formData.hip) || null,
            armR: parseFloat(formData.armR) || null,
            armL: parseFloat(formData.armL) || null,
            forearmR: parseFloat(formData.forearmR) || null,
            forearmL: parseFloat(formData.forearmL) || null,
            thighR: parseFloat(formData.thighR) || null,
            thighL: parseFloat(formData.thighL) || null,
            calfR: parseFloat(formData.calfR) || null,
            calfL: parseFloat(formData.calfL) || null,
            triceps: parseFloat(formData.triceps) || null,
            subscapular: parseFloat(formData.subscapular) || null,
            chest_fold: parseFloat(formData.chest_fold) || null,
            axilla: parseFloat(formData.axilla) || null,
            suprailiac: parseFloat(formData.suprailiac) || null,
            abdominal_fold: parseFloat(formData.abdominal_fold) || null,
            thigh_fold: parseFloat(formData.thigh_fold) || null,
            bmi: results.bmi,
            bodyFat: results.bodyFat,
        };

        const result = await saveAnamneseAction(submitData);
        if (result.success) {
            const newHistory = await getAnamneseHistoryAction(id as string);
            setHistory(newHistory);

            // If it was a NEW evaluation, update formData with the returned ID
            if (result.id) {
                setFormData(prev => ({ ...prev, id: result.id }));
            }

            alert("Avaliação salva com sucesso!");
        } else {
            alert("Erro ao salvar: " + result.error);
        }
        setIsSaving(false);
    };

    const handleDelete = async (anamneseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Deseja realmente excluir este registro?")) return;
        const result = await deleteAnamneseAction(anamneseId, id as string);
        if (result.success) {
            setHistory(prev => prev.filter(h => h.id !== anamneseId));
            if (formData.id === anamneseId) {
                setFormData(prev => ({ ...prev, id: "" }));
            }
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500 font-bold animate-pulse">CARREGANDO DADOS...</div>;

    const comparisonItems = history.filter(h => selectedForComparison.includes(h.id)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <>
            <div className="min-h-screen bg-zinc-50/50 dark:bg-black/50 p-4 lg:p-8 pb-32">
                <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Link href={`/dashboard/alunos/${id}`} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 text-zinc-500 hover:text-brand-primary transition-all">
                                <ChevronLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                                    Avaliação <span className="text-gradient">Física HD</span>
                                </h1>
                                <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                    {athlete?.name || "Atleta"} • {formData.id ? "Editando Avaliação" : "Nova Avaliação"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedForComparison.length === 2 && (
                                <button
                                    onClick={() => setIsComparisonOpen(true)}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-primary text-white shadow-lg text-sm font-black hover:scale-105 transition-all"
                                >
                                    <ArrowRightLeft size={18} /> COMPARAR
                                </button>
                            )}
                            <button
                                onClick={handleNewEvaluation}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 text-sm font-bold text-zinc-600 hover:text-brand-primary transition-all"
                            >
                                <Plus size={18} /> NOVO
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-8 py-3 rounded-2xl premium-gradient text-sm font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                                <Save size={18} /> {isSaving ? "SALVANDO..." : "SALVAR AVALIAÇÃO"}
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-8">
                            <div className="rounded-3xl premium-gradient p-1 shadow-xl">
                                <div className="rounded-[calc(1.5rem-1px)] bg-white dark:bg-zinc-950 p-6 space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Resultados</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                                            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1 text-center">IMC</div>
                                            <div className="text-2xl font-black text-zinc-900 dark:text-white text-center">{results.bmi.toFixed(1)}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-brand-primary/10 ring-1 ring-brand-primary/20">
                                            <div className="text-[10px] font-bold text-brand-primary uppercase mb-1 text-center">% Gordura</div>
                                            <div className="text-2xl font-black text-brand-primary text-center">{results.bodyFat.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Massa Gorda</span>
                                            <span className="text-sm font-black text-red-500">{results.fatMass.toFixed(2)} kg</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Massa Magra</span>
                                            <span className="text-sm font-black text-emerald-500">{results.leanMass.toFixed(2)} kg</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <History size={20} className="text-zinc-400" /> Histórico
                                </h3>
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {history.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-8">Nenhuma avaliação anterior.</p>
                                    ) : (
                                        history.map((h) => (
                                            <div
                                                key={h.id}
                                                onClick={() => handleLoadEvaluation(h)}
                                                className={`group p-4 rounded-2xl cursor-pointer transition-all border-2 relative ${formData.id === h.id
                                                    ? "bg-brand-primary/5 border-brand-primary"
                                                    : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            onClick={(e) => toggleComparison(h.id, e)}
                                                            className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedForComparison.includes(h.id)
                                                                ? "bg-brand-primary border-brand-primary"
                                                                : "border-zinc-300 dark:border-zinc-600"
                                                                }`}
                                                        >
                                                            {selectedForComparison.includes(h.id) && <ArrowRightLeft size={10} className="text-white" />}
                                                        </div>
                                                        <span className="text-xs font-black text-zinc-900 dark:text-white uppercase">{formatDateToBR(h.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={(e) => handleDelete(h.id, e)} className="p-2 text-zinc-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-zinc-400 text-center">
                                                    <span className="bg-white dark:bg-zinc-900/50 rounded-lg p-1.5 shadow-sm">{h.weight}kg</span>
                                                    <span className="bg-white dark:bg-zinc-900/50 text-brand-primary rounded-lg p-1.5 shadow-sm">{h.bodyFat?.toFixed(1)}%</span>
                                                </div>
                                                {h.photoFrontUrl && (
                                                    <div className="mt-3 flex gap-1 h-8">
                                                        <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-md overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-600">
                                                            <img src={h.photoFrontUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                                        </div>
                                                        <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-md overflow-hidden ring-1 ring-zinc-300 dark:ring-zinc-600 font-black text-[8px] flex items-center justify-center text-zinc-400 uppercase">HD</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[10px] text-zinc-400 text-center uppercase tracking-widest font-bold">Selecione 2 para comparar progressão</p>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Scale size={20} className="text-brand-primary" /> {formData.id ? "Dados Gravados" : "Nova Medição"}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Data</label>
                                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Peso (kg)</label>
                                        <input type="number" name="weight" step="0.1" value={formData.weight} onChange={handleInputChange} placeholder="00.0" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-brand-primary font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Altura (cm)</label>
                                        <input type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="000" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-brand-primary font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Protocolo</label>
                                        <select name="method" value={formData.method} onChange={handleInputChange} className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer uppercase font-bold">
                                            <option value="POLLOCK_7">7 DOBRAS</option>
                                            <option value="POLLOCK_3">3 DOBRAS</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Ruler size={20} className="text-emerald-500" /> Perímetros (cm)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { n: 'chest', l: 'Tórax' }, { n: 'waist', l: 'Cintura' }, { n: 'abdomen', l: 'Abdômen' }, { n: 'hip', l: 'Quadril' },
                                        { n: 'armR', l: 'Braço D' }, { n: 'armL', l: 'Braço E' }, { n: 'thighR', l: 'Coxa D' }, { n: 'thighL', l: 'Coxa E' },
                                    ].map(f => (
                                        <div key={f.n}>
                                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">{f.l}</label>
                                            <input type="number" name={f.n} step="0.1" value={(formData as any)[f.n]} onChange={handleInputChange} placeholder="00.0" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Camera size={20} className="text-brand-primary" /> Fotos HD
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: "Frente", name: "photoFrontUrl" },
                                        { label: "Lado", name: "photoSideUrl" },
                                        { label: "Costas", name: "photoBackUrl" }
                                    ].map((slot) => (
                                        <div key={slot.name} className="space-y-3">
                                            <label className="block text-xs font-black uppercase text-zinc-500 ml-1">{slot.label}</label>
                                            <div onClick={() => handlePhotoUpload(slot.name)} className="aspect-[3/4] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 group hover:border-brand-primary transition-all cursor-pointer relative overflow-hidden ring-offset-2 hover:ring-2 hover:ring-brand-primary">
                                                {(formData as any)[slot.name] ? (
                                                    <img src={(formData as any)[slot.name]} className="h-full w-full object-cover" alt={slot.label} />
                                                ) : (
                                                    <>
                                                        <ImageIcon className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={32} />
                                                        <p className="text-[10px] font-bold text-zinc-400">UPLOAD HD</p>
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Alterar</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 ml-1">Observações Visuais</label>
                                    <textarea name="photoNotes" value={formData.photoNotes || ""} onChange={(e: any) => handleInputChange(e)} rows={3} className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Descreva postura, assimetrias..." />
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Plus size={20} className="text-orange-500" /> Dobras Cutâneas (mm)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    {[
                                        { n: 'chest_fold', l: 'Peitoral', show: formData.method === 'POLLOCK_7' || athlete?.gender !== 'F' },
                                        { n: 'triceps', l: 'Tríceps', show: formData.method === 'POLLOCK_7' || athlete?.gender === 'F' },
                                        { n: 'subscapular', l: 'Subescapular', show: formData.method === 'POLLOCK_7' },
                                        { n: 'axilla', l: 'Axilar Média', show: formData.method === 'POLLOCK_7' },
                                        { n: 'suprailiac', l: 'Supra-ilíaca', show: formData.method === 'POLLOCK_7' || athlete?.gender === 'F' },
                                        { n: 'abdominal_fold', l: 'Abdominal', show: formData.method === 'POLLOCK_7' || athlete?.gender !== 'F' },
                                        { n: 'thigh_fold', l: 'Coxa', show: true },
                                    ].filter(f => f.show).map(f => (
                                        <div key={f.n}>
                                            <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">{f.l}</label>
                                            <input type="number" name={f.n} step="0.1" value={(formData as any)[f.n]} onChange={handleInputChange} placeholder="0.0" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-orange-500 font-bold" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Modal */}
            {isComparisonOpen && comparisonItems.length === 2 && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md overflow-y-auto pb-20">
                    <header className="sticky top-0 z-50 p-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-xl">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setIsComparisonOpen(false)} className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all">
                                <X size={24} />
                            </button>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Comparativo <span className="text-brand-primary">Antes & Depois</span></h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase racking-widest">Evolução Visual - {athlete?.name}</p>
                            </div>
                        </div>
                    </header>

                    <main className="max-w-7xl mx-auto p-6 space-y-12">
                        {/* Summary Comparison */}
                        <div className="grid grid-cols-2 gap-8">
                            {comparisonItems.map((item, idx) => (
                                <div key={item.id} className="p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-500 font-black uppercase text-[10px] tracking-widest">{idx === 0 ? "Avaliação Anterior" : "Avaliação Recente"}</span>
                                        <span className="text-brand-primary font-black uppercase text-sm">{formatDateToBR(item.date)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                            <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Peso</p>
                                            <p className="text-2xl font-black text-white">{item.weight}kg</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-center">
                                            <p className="text-[9px] text-brand-primary uppercase font-black mb-1">% Gordura</p>
                                            <p className="text-2xl font-black text-brand-primary">{item.bodyFat?.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Photo Comparison Sections */}
                        {[
                            { label: "Vista Frontal", name: "photoFrontUrl" },
                            { label: "Vista Lateral", name: "photoSideUrl" },
                            { label: "Vista Posterior", name: "photoBackUrl" }
                        ].map((view) => (
                            <section key={view.name} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-black uppercase tracking-widest">{view.label}</div>
                                    <div className="flex-1 h-[1px] bg-white/10"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 h-[700px]">
                                    {comparisonItems.map((item) => (
                                        <div key={item.id} className="relative rounded-[40px] overflow-hidden bg-zinc-900 ring-4 ring-white/5 group shadow-2xl">
                                            {item[view.name] ? (
                                                <>
                                                    <img src={item[view.name]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute top-8 left-8 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
                                                        <p className="text-white text-xs font-black uppercase">{formatDateToBR(item.date)}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-700">
                                                    <Camera size={64} />
                                                    <p className="text-sm font-black uppercase tracking-widest">Sem Foto</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {/* Measurements Comparison Table */}
                        <section className="rounded-3xl bg-zinc-900 border border-white/10 p-8 shadow-2xl overflow-hidden">
                            <h3 className="text-xl font-black text-white uppercase mb-8 flex items-center gap-3">
                                <Activity size={24} className="text-brand-primary" /> Comparativo de Medidas
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="py-4 text-zinc-500 text-[10px] font-black uppercase">Medida</th>
                                            <th className="py-4 text-zinc-400 text-sm font-black uppercase">{formatDateToBR(comparisonItems[0].date)}</th>
                                            <th className="py-4 text-zinc-400 text-sm font-black uppercase">{formatDateToBR(comparisonItems[1].date)}</th>
                                            <th className="py-4 text-brand-primary text-sm font-black uppercase">Evolução</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[
                                            { l: 'Peso (kg)', n: 'weight' },
                                            { l: 'Tórax (cm)', n: 'chest' },
                                            { l: 'Cintura (cm)', n: 'waist' },
                                            { l: 'Abdômen (cm)', n: 'abdomen' },
                                            { l: 'Quadril (cm)', n: 'hip' },
                                            { l: 'Braço D (cm)', n: 'armR' },
                                            { l: 'Braço E (cm)', n: 'armL' },
                                            { l: 'Gordura (%)', n: 'bodyFat' }
                                        ].map(m => {
                                            const v1 = comparisonItems[0][m.n] || 0;
                                            const v2 = comparisonItems[1][m.n] || 0;
                                            const diff = v2 - v1;
                                            const isReduction = m.n === 'bodyFat' || m.n === 'waist' || m.n === 'weight' || m.n === 'abdomen';
                                            const positiveResult = isReduction ? diff <= 0 : diff >= 0;

                                            return (
                                                <tr key={m.n} className="hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 text-zinc-400 text-xs font-bold uppercase">{m.l}</td>
                                                    <td className="py-4 text-white font-black text-sm">{v1.toFixed(1)}</td>
                                                    <td className="py-4 text-white font-black text-sm">{v2.toFixed(1)}</td>
                                                    <td className={`py-4 font-black text-sm ${positiveResult ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </main>
                </div>
            )}

            <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="afterInteractive" />
        </>
    );
}
