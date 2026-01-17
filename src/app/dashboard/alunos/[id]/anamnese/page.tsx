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

    const dateInputRef = useRef<HTMLInputElement>(null);

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
        const age = athlete?.idade || 30; // Corrigido de athlete.age para athlete.idade
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
            // Pollock 3: 
            // Homens: Peitoral, Abdominal, Coxa
            // Mulheres: Tríceps, Supra-ilíaca, Coxa
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

        const csvContent = [
            headers.join(";"), // Using semicolon for Better Excel compatibility in Brazil
            ...rows.map(r => r.join(";"))
        ].join("\n");

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

        // Header styling
        doc.setFillColor(34, 197, 94); // brand-primary
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Relatório de Avaliação Física", 14, 25);

        doc.setTextColor(63, 63, 70); // zinc-700
        doc.setFontSize(12);
        doc.text(`Atleta: ${athlete?.name || "N/A"}`, 14, 50);
        doc.text(`Data da Avaliação: ${new Date(formData.date).toLocaleDateString('pt-BR')}`, 14, 57);
        doc.text(`Gerado em: ${dateStr}`, 14, 64);

        // Section: Composição Corporal
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

        // Section: Dobras Cutâneas
        const finalY = (doc as any).lastAutoTable.finalY || 130;
        doc.setTextColor(34, 197, 94);
        doc.text("Dobras Cutâneas (mm)", 14, finalY + 15);

        const foldsData = [
            ['Dobra Peitoral', formData.chest_fold || '--'],
            ['Dobra Tríceps', formData.triceps || '--'],
            ['Dobra Subescapular', formData.subscapular || '--'],
            ['Dobra Axilar Média', formData.axilla || '--'],
            ['Dobra Supra-ilíaca', formData.suprailiac || '--'],
            ['Dobra Abdominal', formData.abdominal_fold || '--'],
            ['Dobra Coxa', formData.thigh_fold || '--'],
        ];

        autoTable(doc, {
            startY: finalY + 20,
            head: [['Dobra', 'Milímetros']],
            body: foldsData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22] } // Orange
        });

        // Section: Perímetros
        const nextY = (doc as any).lastAutoTable.finalY || 200;

        // Check if we need a new page
        if (nextY > 230) doc.addPage();

        const startYPerim = nextY > 230 ? 20 : nextY + 15;

        doc.setTextColor(34, 197, 94);
        doc.text("Perímetros (cm)", 14, startYPerim);

        const perimetersData = [
            ['Tórax', formData.chest || '--'],
            ['Cintura', formData.waist || '--'],
            ['Abdômen', formData.abdomen || '--'],
            ['Quadril', formData.hip || '--'],
            ['Braço D/E', `${formData.armR || '--'} / ${formData.armL || '--'}`],
            ['Antebraço D/E', `${formData.forearmR || '--'} / ${formData.forearmL || '--'}`],
            ['Coxa D/E', `${formData.thighR || '--'} / ${formData.thighL || '--'}`],
            ['Panturrilha D/E', `${formData.calfR || '--'} / ${formData.calfL || '--'}`],
        ];

        autoTable(doc, {
            startY: startYPerim + 5,
            head: [['Local', 'Centímetros']],
            body: perimetersData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] } // Blue
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

    if (loading) return <div className="p-12 text-center text-zinc-500">Carregando dados da anamnese...</div>;

    return (
        <div className="space-y-8 animate-slide-up max-w-6xl mx-auto pb-20">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                            Anamnese: <span className="text-gradient">{athlete?.name}</span>
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Registro de medidas e composição corporal</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        title="Exportar Histórico CSV"
                        className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700"
                    >
                        <FileText size={20} />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        title="Gerar Relatório PDF"
                        className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-2xl premium-gradient px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {isSaving ? "Salvando..." : "Salvar Registro"}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lateral: Resumo em Tempo Real */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl bg-zinc-900 dark:bg-black p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Activity size={120} />
                        </div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-brand-primary" /> Resultados Atuais
                        </h3>
                        <div className="space-y-6 relative z-10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-4">
                                    <p className="text-xs text-zinc-400 uppercase font-bold mb-1">IMC</p>
                                    <p className="text-2xl font-black text-brand-primary">{results.bmi.toFixed(1)}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">
                                        {results.bmi < 18.5 ? "Abaixo do peso" :
                                            results.bmi < 25 ? "Normal" :
                                                results.bmi < 30 ? "Sobrepeso" : "Obesidade"}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4">
                                    <p className="text-xs text-zinc-400 uppercase font-bold mb-1">% Gordura</p>
                                    <p className="text-2xl font-black text-emerald-500">{results.bodyFat.toFixed(1)}%</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">Protocolo {formData.method === 'POLLOCK_7' ? '7' : '3'} Dobras</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-2xl p-4">
                                    <p className="text-xs text-zinc-400 uppercase font-bold mb-1">Massa Gorda</p>
                                    <p className="text-2xl font-black text-orange-500">{results.fatMass.toFixed(2)} <span className="text-xs font-normal">kg</span></p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4">
                                    <p className="text-xs text-zinc-400 uppercase font-bold mb-1">Massa Magra</p>
                                    <p className="text-2xl font-black text-blue-500">{results.leanMass.toFixed(2)} <span className="text-xs font-normal">kg</span></p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold uppercase text-zinc-500">Protocolo de Dobras</label>
                                <select
                                    name="method"
                                    value={formData.method}
                                    onChange={handleInputChange}
                                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all cursor-pointer"
                                >
                                    <option value="POLLOCK_7" className="bg-zinc-900">Pollock 7 Dobras</option>
                                    <option value="POLLOCK_3" className="bg-zinc-900">Pollock 3 Dobras</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <History size={20} className="text-blue-500" /> Histórico
                        </h3>
                        {history.length === 0 ? (
                            <p className="text-center text-zinc-400 text-sm py-4">Nenhum registro anterior.</p>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {history.map((h) => (
                                    <div key={h.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">{new Date(h.date).toLocaleDateString()}</p>
                                            <div className="flex gap-3 mt-1">
                                                <span className="text-[10px] text-zinc-500">IMC: <strong>{h.bmi?.toFixed(1)}</strong></span>
                                                <span className="text-[10px] text-zinc-500">%G: <strong>{h.bodyFat?.toFixed(1)}%</strong></span>
                                                <span className="text-[10px] text-zinc-500">MG: <strong>{((h.weight * h.bodyFat) / 100).toFixed(1)}kg</strong></span>
                                                <span className="text-[10px] text-zinc-500">MM: <strong>{(h.weight - (h.weight * h.bodyFat) / 100).toFixed(1)}kg</strong></span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(h.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Principal: Formulário de Medidas */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Básicos */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Scale size={20} className="text-brand-primary" /> Dados Básicos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 ml-1">Data da Avaliação</label>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => dateInputRef.current?.showPicker()}
                                >
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatDateToBR(formData.date)}
                                        className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer font-medium"
                                    />
                                    <input
                                        type="date"
                                        ref={dateInputRef}
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-brand-primary transition-colors">
                                        📅
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 ml-1">Peso (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    step="0.1"
                                    value={formData.weight}
                                    onChange={handleInputChange}
                                    placeholder="00.0"
                                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 ml-1">Altura (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleInputChange}
                                    placeholder="175"
                                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Perímetros */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Ruler size={20} className="text-emerald-500" /> Perímetros (cm)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { n: 'chest', l: 'Tórax' }, { n: 'waist', l: 'Cintura' }, { n: 'abdomen', l: 'Abdômen' }, { n: 'hip', l: 'Quadril' },
                                { n: 'armR', l: 'Braço D' }, { n: 'armL', l: 'Braço E' }, { n: 'forearmR', l: 'Antebraço D' }, { n: 'forearmL', l: 'Antebraço E' },
                                { n: 'thighR', l: 'Coxa D' }, { n: 'thighL', l: 'Coxa E' }, { n: 'calfR', l: 'Panturrilha D' }, { n: 'calfL', l: 'Panturrilha E' },
                            ].map(f => (
                                <div key={f.n}>
                                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1 ml-1">{f.l}</label>
                                    <input
                                        type="number"
                                        name={f.n}
                                        step="0.1"
                                        value={(formData as any)[f.n]}
                                        onChange={handleInputChange}
                                        placeholder="00.0"
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Avaliação Visual (HD Photos) */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Camera size={20} className="text-brand-primary" /> Avaliação Visual (HD)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: "Frente", name: "photoFrontUrl" },
                                { label: "Lado", name: "photoSideUrl" },
                                { label: "Costas", name: "photoBackUrl" }
                            ].map((slot) => (
                                <div key={slot.name} className="space-y-3">
                                    <label className="block text-xs font-bold uppercase text-zinc-500 ml-1">{slot.label}</label>
                                    <div className="aspect-[3/4] rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 group hover:border-brand-primary transition-all cursor-pointer relative overflow-hidden">
                                        {(formData as any)[slot.name] ? (
                                            <img src={(formData as any)[slot.name]} className="h-full w-full object-cover" alt={slot.label} />
                                        ) : (
                                            <>
                                                <ImageIcon className="text-zinc-300 group-hover:text-brand-primary transition-colors" size={32} />
                                                <p className="text-[10px] font-bold text-zinc-400">Clique para enviar</p>
                                            </>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">Upload HD</p>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-zinc-400 text-center italic">Qualidade original preservada</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6">
                            <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 ml-1">Observações da Avaliação Visual</label>
                            <textarea
                                name="photoNotes"
                                value={formData.photoNotes || ""}
                                onChange={(e: any) => handleInputChange(e)}
                                rows={3}
                                className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                placeholder="Descreva postura, assimetrias ou detalhes visuais..."
                            />
                        </div>
                    </div>

                    {/* Dobras Cutâneas */}
                    <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Plus size={20} className="text-orange-500" /> Dobras Cutâneas (mm)
                            </h3>
                            <span className="text-[10px] font-black uppercase px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 rounded-full">
                                {formData.method === 'POLLOCK_7' ? '7 Dobras' : '3 Dobras'}
                            </span>
                        </div>
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
                                    <input
                                        type="number"
                                        name={f.n}
                                        step="0.1"
                                        value={(formData as any)[f.n]}
                                        onChange={handleInputChange}
                                        placeholder="0.0"
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm ring-1 ring-zinc-200 dark:ring-zinc-700 outline-none focus:ring-2 focus:ring-brand-primary border-l-4 border-orange-500"
                                    />
                                </div>
                            ))}
                        </div>
                        {formData.method === 'POLLOCK_3' && (
                            <p className="mt-6 text-[10px] text-zinc-500 italic">
                                * Protocolo de 3 dobras para {athlete?.gender === 'F' ? 'mulheres utiliza: Tríceps, Supra-ilíaca e Coxa' : 'homens utiliza: Peitoral, Abdominal e Coxa'}.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
