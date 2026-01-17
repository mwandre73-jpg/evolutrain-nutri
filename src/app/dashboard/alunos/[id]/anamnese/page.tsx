"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAthleteAction } from "@/app/actions/athletes";
import { saveAnamneseAction, getAnamneseHistoryAction, deleteAnamneseAction } from "@/app/actions/anamnesis";
import { calcularIMC, calcularDensidadePollock3Homens, calcularDensidadePollock7Homens, calcularDensidadePollock3Mulheres, calcularDensidadePollock7Mulheres, calcularPercentualGorduraSiri } from "@/lib/calculos";
import { Plus, Trash2, ChevronLeft, Save, Scale, Ruler, Activity, History, Download, FileText, Camera, Image as ImageIcon } from "lucide-react";
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

    const [formData, setFormData] = useState({
        weight: "",
        height: "",
        date: new Date().toISOString().split('T')[0],
        // Circumferences
        chest: "", waist: "", abdomen: "", hip: "",
        armR: "", armL: "", forearmR: "", forearmL: "",
        thighR: "", thighL: "", calfR: "", calfL: "",
        // Skinfolds
        triceps: "", subscapular: "", chest_fold: "",
        axilla: "", suprailiac: "", abdominal_fold: "", thigh_fold: "",
        // Method
        method: "POLLOCK_7",
        // High-Definition Assessment Photos
        photoFrontUrl: "",
        photoSideUrl: "",
        photoBackUrl: "",
        photoNotes: ""
    });

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

    const handleExportCSV = () => {
        if (history.length === 0) {
            alert("Nenhum histórico para exportar.");
            return;
        }

        const headers = [
            "Data", "Peso", "Altura", "IMC", "% Gordura",
            "Torax", "Cintura", "Abdomen", "Quadril",
            "Braco D", "Braco E", "Antebraco D", "Antebraco E",
            "Coxa D", "Coxa E", "Panturrilha D", "Panturrilha E",
            "Triceps", "Subescapular", "Peitoral", "Axilar", "Suprailiaca", "Abdominal", "Coxa_Dobras"
        ];

        const rows = history.map((h: any) => [
            h.date, h.weight, h.height, h.bmi?.toFixed(1), h.bodyFat?.toFixed(1),
            h.chest || "", h.waist || "", h.abdomen || "", h.hip || "",
            h.armR || "", h.armL || "", h.forearmR || "", h.forearmL || "",
            h.thighR || "", h.thighL || "", h.calfR || "", h.calfL || "",
            h.triceps || "", h.subscapular || "", h.chest_fold || "", h.axilla || "", h.suprailiac || "", h.abdominal_fold || "", h.thigh_fold || ""
        ]);

        const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `anamnese_${athlete?.name || "atleta"}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('pt-BR');

        doc.setFillColor(34, 197, 94);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Relatório de Avaliação Física", 14, 25);

        doc.setTextColor(63, 63, 70);
        doc.setFontSize(12);
        doc.text(`Atleta: ${athlete?.name || "N/A"}`, 14, 50);
        doc.text(`Data da Avaliação: ${new Date(formData.date).toLocaleDateString('pt-BR')}`, 14, 57);
        doc.text(`Gerado em: ${dateStr}`, 14, 64);

        doc.setTextColor(34, 197, 94);
        doc.setFontSize(16);
        doc.text("Composição Corporal", 14, 80);

        autoTable(doc, {
            startY: 85,
            head: [['Medida', 'Resultado']],
            body: [
                ['Peso', `${formData.weight} kg`],
                ['Altura', `${formData.height} cm`],
                ['IMC', `${results.bmi.toFixed(1)}`],
                ['% de Gordura', `${results.bodyFat.toFixed(1)}%`],
                ['Massa Gorda', `${results.fatMass.toFixed(2)} kg`],
                ['Massa Magra', `${results.leanMass.toFixed(2)} kg`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94] }
        });

        doc.save(`avaliacao_${athlete?.name || "atleta"}.pdf`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const submitData = {
            athleteProfileId: id as string,
            ...formData,
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
            alert("Anamnese salva com sucesso!");
        } else {
            alert("Erro ao salvar: " + result.error);
        }
        setIsSaving(false);
    };

    const handleDelete = async (anamneseId: string) => {
        if (!confirm("Deseja realmente excluir este registro?")) return;
        const result = await deleteAnamneseAction(anamneseId, id as string);
        if (result.success) {
            setHistory(prev => prev.filter(h => h.id !== anamneseId));
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500 font-bold animate-pulse">CARREGANDO DADOS...</div>;

    return (
        <>
            <div className="min-h-screen bg-zinc-50/50 dark:bg-black/50 p-4 lg:p-8 pb-24">
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
                                    {athlete?.name || "Atleta"} • Composição & Visual
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={handleExportCSV} className="hidden md:flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 text-sm font-bold text-zinc-600 hover:text-brand-primary transition-all active:scale-95">
                                <Download size={18} /> Exportar
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
                                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">Composição Atual</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                                            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">IMC</div>
                                            <div className="text-2xl font-black text-zinc-900 dark:text-white">{results.bmi.toFixed(1)}</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-brand-primary/10 ring-1 ring-brand-primary/20">
                                            <div className="text-[10px] font-bold text-brand-primary uppercase mb-1">% Gordura</div>
                                            <div className="text-2xl font-black text-brand-primary">{results.bodyFat.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                                            <span className="text-xs font-bold text-zinc-500 uppercase">Massa Gorda</span>
                                            <span className="text-sm font-black text-red-500">{results.fatMass.toFixed(2)} kg</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
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
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {history.length === 0 ? (
                                        <p className="text-sm text-zinc-500 text-center py-8">Nenhuma avaliação anterior.</p>
                                    ) : (
                                        history.map((h) => (
                                            <div key={h.id} className="group p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:ring-2 hover:ring-brand-primary transition-all relative">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-black text-zinc-900 dark:text-white">{formatDateToBR(h.date)}</span>
                                                    <button onClick={() => handleDelete(h.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-zinc-400 text-center">
                                                    <span className="bg-white dark:bg-zinc-900 rounded-lg p-1">{h.weight}kg</span>
                                                    <span className="bg-brand-primary/10 text-brand-primary rounded-lg p-1">{h.bodyFat?.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-8">
                            <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Scale size={20} className="text-brand-primary" /> Dados & Protocolo
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Data</label>
                                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Peso (kg)</label>
                                        <input type="number" name="weight" step="0.1" value={formData.weight} onChange={handleInputChange} placeholder="00.0" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-brand-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Altura (cm)</label>
                                        <input type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="000" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-brand-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1 ml-1">Protocolo</label>
                                        <select name="method" value={formData.method} onChange={handleInputChange} className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer">
                                            <option value="POLLOCK_7">Pollock (7 Dobras)</option>
                                            <option value="POLLOCK_3">Pollock (3 Dobras)</option>
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
                                    <Camera size={20} className="text-brand-primary" /> Avaliação Visual HD
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: "Frente", name: "photoFrontUrl" },
                                        { label: "Lado", name: "photoSideUrl" },
                                        { label: "Costas", name: "photoBackUrl" }
                                    ].map((slot) => (
                                        <div key={slot.name} className="space-y-3">
                                            <label className="block text-xs font-black uppercase text-zinc-500 ml-1">{slot.label}</label>
                                            <div onClick={() => handlePhotoUpload(slot.name)} className="aspect-[3/4] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 group hover:border-brand-primary transition-all cursor-pointer relative overflow-hidden">
                                                {(formData as any)[slot.name] ? (
                                                    <img src={(formData as any)[slot.name]} className="h-full w-full object-cover" alt={slot.label} />
                                                ) : (
                                                    <>
                                                        <ImageIcon className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={32} />
                                                        <p className="text-[10px] font-bold text-zinc-400">CLIQUE PARA ENVIAR</p>
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-white text-[10px] font-black uppercase tracking-widest">Upload HD</p>
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
                                            <input type="number" name={f.n} step="0.1" value={(formData as any)[f.n]} onChange={handleInputChange} placeholder="0.0" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-orange-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="afterInteractive" />
        </>
    );
}
