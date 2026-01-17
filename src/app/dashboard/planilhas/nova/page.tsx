"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAthletes, getAthleteAction } from "@/app/actions/athletes";
import { saveWorkoutAction, getWorkoutTemplatesAction, saveWorkoutTemplateAction, updateWorkoutTemplateAction, checkAthletesWorkoutsAction } from "@/app/actions/workouts";
import { getExercisesAction } from "@/app/actions/exercises";
import { kmhParaPace, calcularLAN, calcularVelocidadePorClassificacao, ZONAS_CONFIG } from "@/lib/calculos";
import SearchableExerciseSelect from "@/components/dashboard/SearchableExerciseSelect";


export default function NovaPlanilhaPage() {
    const router = useRouter();
    const [athletes, setAthletes] = useState<any[]>([]);
    const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
    const [athleteData, setAthleteData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [repeatWeeks, setRepeatWeeks] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState<"all" | "pending" | "prescribed">("all");
    const [prescribedIds, setPrescribedIds] = useState<string[]>([]);
    const [libraryExercises, setLibraryExercises] = useState<any[]>([]);
    const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<any[]>([]);

    // Form data
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [type, setType] = useState("Corrida");
    const [classification, setClassification] = useState("CRM");
    const [bodyPart, setBodyPart] = useState<"SUPERIORES" | "INFERIORES" | "">("");
    const [selectedExercise, setSelectedExercise] = useState("");
    const [weightPercent, setWeightPercent] = useState<number>(85);
    const [customPercent, setCustomPercent] = useState<number>(0);
    const [speedDistance, setSpeedDistance] = useState("30m");
    const [description, setDescription] = useState("");
    const [rangeMin, setRangeMin] = useState<number>(0);
    const [rangeMax, setRangeMax] = useState<number>(0);

    // Auto-calculated intensity
    const [intensity, setIntensity] = useState("");
    const [calcIntensity, setCalcIntensity] = useState("");

    // References for weight
    const [references, setReferences] = useState({ supino: 0, agachamento: 0 });

    // Calculator for specific distance
    const [calcDistance, setCalcDistance] = useState<number>(600);
    const [calcMin, setCalcMin] = useState<number>(0);
    const [calcSec, setCalcSec] = useState<number>(0);
    const [isManualTime, setIsManualTime] = useState(false);
    const [calcRest, setCalcRest] = useState<string>("1'00\"");
    const [currentPaceSeconds, setCurrentPaceSeconds] = useState<number>(0);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Helper to format date for display (DD/MM/YYYY)
    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        getAthletes().then(setAthletes);
        getWorkoutTemplatesAction().then(setTemplates);
        getExercisesAction().then(setLibraryExercises);
    }, []);

    useEffect(() => {
        if (date) {
            checkAthletesWorkoutsAction(date).then(res => {
                if (res.success) setPrescribedIds(res.prescribedIds);
            });
        }
    }, [date]);

    useEffect(() => {
        if (['Z1', 'Z2', 'Z3', 'Z4'].includes(classification)) {
            if (classification === 'Z1') { setRangeMin(ZONAS_CONFIG.REGENERATIVO.min * 100); setRangeMax(ZONAS_CONFIG.REGENERATIVO.max * 100); }
            else if (classification === 'Z2') { setRangeMin(ZONAS_CONFIG.AEROBICO.min * 100); setRangeMax(ZONAS_CONFIG.AEROBICO.max * 100); }
            else if (classification === 'Z3') { setRangeMin(ZONAS_CONFIG.LIMIAR.min * 100); setRangeMax(ZONAS_CONFIG.LIMIAR.max * 100); }
            else if (classification === 'Z4') { setRangeMin(ZONAS_CONFIG.ANAEROBICO.min * 100); setRangeMax(ZONAS_CONFIG.ANAEROBICO.max * 100); }
        } else {
            setRangeMin(0);
            setRangeMax(0);
        }
    }, [classification]);

    useEffect(() => {
        if (selectedAthletes.length === 1) {
            getAthleteAction(selectedAthletes[0]).then(data => {
                setAthleteData(data);

                // Buscar referências de força
                const metrics = data?.metrics || [];
                const supino = metrics.find((m: any) => m.exercise?.toLowerCase().includes("supino"))?.result || 0;
                const agacho = metrics.find((m: any) => m.exercise?.toLowerCase().includes("agachamento"))?.result || 0;
                setReferences({ supino, agachamento: agacho });

                if (type === 'Corrida') {
                    const latestAerobic = metrics.find((m: any) => m.category === 'AEROBIC');
                    const latestSpeed = metrics.find((m: any) => m.category === 'SPEED');

                    // Garantir que a distância selecionada é válida para o novo atleta
                    const athleteSpeeds = metrics.filter((m: any) => m.category === 'SPEED').map((m: any) => m.exercise);
                    if (athleteSpeeds.length > 0 && !athleteSpeeds.includes(speedDistance)) {
                        setSpeedDistance(athleteSpeeds[0]);
                    }

                    if (classification === 'Speed') {
                        if (latestSpeed?.vmax) {
                            updateIntensity(latestSpeed.vmax, classification, customPercent);
                        } else {
                            setIntensity("Sem teste de velocidade recente");
                        }
                    } else if (latestAerobic?.vmax) {
                        updateIntensity(latestAerobic.vmax, classification, customPercent);
                    } else {
                        setIntensity("Sem teste aeróbico recente");
                    }
                }
            });
        } else if (selectedAthletes.length > 1) {
            setAthleteData(null);
            setIntensity("Vários atletas selecionados");
        } else {
            setAthleteData(null);
            setIntensity("");
        }
    }, [selectedAthletes, type, classification, customPercent, rangeMin, rangeMax, speedDistance]);

    const updateIntensity = (vmax: number, cls: string, manual: number, isCalculator: boolean = false) => {
        // Se houver faixa definida (Z1-Z4)
        if (['Z1', 'Z2', 'Z3', 'Z4'].includes(cls) && rangeMin > 0 && rangeMax > 0) {
            const speedMin = calcularVelocidadePorClassificacao(vmax, cls, rangeMin);
            const speedMax = calcularVelocidadePorClassificacao(vmax, cls, rangeMax);
            const paceMin = kmhParaPace(speedMin);
            const paceMax = kmhParaPace(speedMax);

            const display = `Ritmo ${paceMax} a ${paceMin} min/km (${cls}: ${rangeMin}-${rangeMax}%)`;
            if (isCalculator) {
                setCalcIntensity(display);
                setCurrentPaceSeconds(speedMax > 0 ? 3600 / speedMax : 0);
            } else {
                setIntensity(display);
            }
            return;
        }

        const vel = calcularVelocidadePorClassificacao(vmax, cls, manual || undefined);
        const pace = kmhParaPace(vel);

        if (isCalculator) {
            if (vel > 0) setCurrentPaceSeconds(3600 / vel);
            else setCurrentPaceSeconds(0);
        }

        let label = "";
        if (manual) {
            let baseName = "LAN";
            if (cls === 'CustomVmax') baseName = "Vmax";
            if (cls === 'Speed') baseName = `Velocidade ${speedDistance}`;
            label = `(${manual}% da ${baseName})`;
        } else {
            switch (cls) {
                case 'CRM': label = `(CRM)`; break;
                case 'CL': label = `(CL)`; break;
                case 'Z1': label = `(Z1)`; break;
                case 'Z2': label = `(Z2)`; break;
                case 'Z3': label = `(Z3)`; break;
                case 'IE': label = `(IE)`; break;
                case 'Speed': label = speedDistance ? `(Speed) ${speedDistance}` : `(Speed)`; break;
                default: label = cls === 'CustomVmax' ? `(${manual}% da Vmax)` : `(100% da LAN)`;
            }
        }

        if (isCalculator) setCalcIntensity(`Ritmo ${pace} min/km ${label}`);
        else setIntensity(`Ritmo ${pace} min/km ${label}`);
    };

    // Unified Intensity Update
    useEffect(() => {
        if (type === 'Corrida') {
            const metrics = athleteData?.metrics || [];
            const latestAerobic = metrics.find((m: any) => m.category === 'AEROBIC');
            const latestSpeed = metrics.find((m: any) => m.category === 'SPEED' && m.exercise === speedDistance);

            const baseVmax = classification === 'Speed' ? latestSpeed?.vmax : latestAerobic?.vmax;

            if (baseVmax) {
                // Update Global string
                updateIntensity(baseVmax, classification, customPercent, false);
                // Update Calculator (Pace and String)
                updateIntensity(baseVmax, classification, customPercent, true);
            } else {
                setIntensity(classification === 'Speed' ? `Sem teste de velocidade ${speedDistance}` : "Sem teste aeróbico");
            }
        } else {
            setIntensity("");
            setCalcIntensity("");
            setCurrentPaceSeconds(0);
        }
    }, [classification, customPercent, type, athleteData]);

    useEffect(() => {
        if (currentPaceSeconds > 0 && calcDistance > 0 && !isManualTime) {
            const totalSeconds = (currentPaceSeconds * calcDistance) / 1000;
            const roundedTotalSeconds = Math.round(totalSeconds);
            const minutes = Math.floor(roundedTotalSeconds / 60);
            const seconds = roundedTotalSeconds % 60;
            setCalcMin(minutes);
            setCalcSec(seconds);
        }
    }, [currentPaceSeconds, calcDistance, isManualTime]);

    // Calcular Distância a partir do Tempo
    const handleTimeChange = (m: number, s: number) => {
        setIsManualTime(true);
        setCalcMin(m);
        setCalcSec(s);

        if (currentPaceSeconds > 0) {
            const totalSeconds = (m * 60) + s;
            const dist = (totalSeconds * 1000) / currentPaceSeconds;
            setCalcDistance(Math.round(dist));
        }

        // Reset manual flag after a short delay or on next distance change
        setTimeout(() => setIsManualTime(false), 100);
    };

    const handleAddExercise = () => {
        if (!selectedExercise) return;

        // Find the exercise in the library to get the ID
        const exerciseData = libraryExercises.find(ex => ex.name === selectedExercise);

        if (exerciseData) {
            setSelectedWorkoutExercises(prev => [...prev, {
                exerciseId: exerciseData.id,
                sets: 3, // Default sets
                reps: 12, // Default reps
                weight: parseFloat(((bodyPart === 'SUPERIORES' ? references.supino : references.agachamento) * (weightPercent / 100)).toFixed(1)),
                name: selectedExercise
            }]);
        }

        const cargaStr = weightPercent > 0 ? `: {C:${weightPercent}:${selectedExercise.split(' ')[0]}}` : "";
        const newText = description ? description + `\n- ${selectedExercise}: 3x12${cargaStr}` : `- ${selectedExercise}: 3x12${cargaStr}`;
        setDescription(newText);
        setSelectedExercise("");
    };

    const handleAddInterval = () => {
        if (calcDistance <= 0) return;

        const timeStr = calcMin > 0
            ? `${calcMin}m ${calcSec < 10 ? "0" : ""}${calcSec}s`
            : `${calcSec}s`;

        // Formato da tag: {T:distancia:classificacao:percentual:referencia}
        let tagParams = classification;
        if (rangeMin > 0 && rangeMax > 0) {
            tagParams += `:${rangeMin}-${rangeMax}`;
        } else if (classification === 'Custom' || classification === 'CustomVmax' || classification === 'Speed') {
            tagParams += `:${customPercent || 100}`;
            if (classification === 'Speed') {
                tagParams += `:${speedDistance}`;
            }
        }
        // Lógica para pluralizar "Tiro" se houver um número antes
        let label = "Tiro";
        const trimmedDesc = description.trim();
        const match = trimmedDesc.match(/(\d+)$/);
        if (match) {
            const count = parseInt(match[1]);
            if (count > 1) label = "Tiros";
        }

        const intervalText = `${label} de ${calcDistance}m: {T:${calcDistance}:${tagParams}}`;

        if (!description) {
            setDescription(`- ${intervalText}`);
            return;
        }

        const lastChar = description[description.length - 1];
        if (lastChar === '\n') {
            setDescription(description + `- ${intervalText}`);
        } else {
            setDescription(description + ' ' + intervalText);
        }
    };
    const handleAddRest = () => {
        if (!calcRest) return;

        const restText = `int. ${calcRest}`;
        if (!description) {
            setDescription(restText);
            return;
        }

        const lastChar = description[description.length - 1];
        if (lastChar === '\n') {
            setDescription(description + restText);
        } else {
            setDescription(description + ' ' + restText);
        }
    };

    const handleSave = async () => {
        if (selectedAthletes.length === 0 || !description) return;
        setLoading(true);

        // Se pediram para salvar como modelo
        if (isSavingTemplate && templateName) {
            await saveWorkoutTemplateAction({
                name: templateName,
                type,
                description,
                prescribedIntensity: intensity || (type === "Musculação" ? (bodyPart === "SUPERIORES" ? "Membros Superiores" : "Membros Inferiores") : ""),
            });
            getWorkoutTemplatesAction().then(setTemplates);
        } else if (isUpdatingTemplate && selectedTemplate && templateName) {
            await updateWorkoutTemplateAction(selectedTemplate, {
                name: templateName,
                type,
                description,
                prescribedIntensity: intensity || (type === "Musculação" ? (bodyPart === "SUPERIORES" ? "Membros Superiores" : "Membros Inferiores") : ""),
            });
            getWorkoutTemplatesAction().then(setTemplates);
        }

        const res = await saveWorkoutAction({
            athleteProfileIds: selectedAthletes,
            date,
            type,
            description,
            prescribedIntensity: intensity || (type === "Musculação" ? (bodyPart === "SUPERIORES" ? "Membros Superiores" : "Membros Inferiores") : ""),
            repeatWeeks,
            classification,
            customPercent,
            exercises: type === "Musculação" ? selectedWorkoutExercises : undefined
        });

        if (res.success) {
            router.push("/dashboard/planilhas");
        } else {
            alert(res.error || "Erro ao salvar planilha");
            setLoading(false);
        }
    };

    const handleLoadTemplate = (id: string) => {
        const template = templates.find(t => t.id === id);
        if (template) {
            setType(template.type);
            setDescription(template.description);
            setTemplateName(template.name);
            setSelectedTemplate(id);
            setIsUpdatingTemplate(true);
            setIsSavingTemplate(false);
        } else {
            // Se selecionar "Nenhum modelo", reseta os campos de modelo
            setSelectedTemplate("");
            setTemplateName("");
            setDescription("");
            setIsUpdatingTemplate(false);
            setIsSavingTemplate(false);
        }
    };

    const handleAthleteToggle = (id: string) => {
        setSelectedAthletes(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Nova <span className="text-gradient">Planilha</span>
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Crie uma prescrição personalizada para seu atleta.
                    </p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="text-zinc-500 hover:text-zinc-900 font-medium"
                >
                    Cancelar
                </button>
            </header>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 space-y-6">
                        {/* Atleta e Data */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Atletas</label>
                                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full font-bold">
                                        {selectedAthletes.length} selecionados
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Buscar atleta pelo nome..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full text-xs rounded-xl bg-zinc-50 border-none px-4 py-2 focus:ring-1 focus:ring-brand-primary dark:bg-zinc-800"
                                    />
                                    <div className="flex gap-1">
                                        {(["all", "pending", "prescribed"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setFilterMode(mode)}
                                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filterMode === mode ? "bg-brand-primary text-black" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
                                            >
                                                {mode === "all" ? "Todos" : mode === "pending" ? "Pendentes" : "Já Prescritos"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto p-2 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                                    {athletes
                                        .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .filter(a => {
                                            if (filterMode === "pending") return !prescribedIds.includes(a.id);
                                            if (filterMode === "prescribed") return prescribedIds.includes(a.id);
                                            return true;
                                        })
                                        .map(a => (
                                            <label key={a.id} className="flex items-center gap-2 text-sm p-2 cursor-pointer hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAthletes.includes(a.id)}
                                                    onChange={() => handleAthleteToggle(a.id)}
                                                    className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary"
                                                />
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className={`size-2 rounded-full flex-shrink-0 ${prescribedIds.includes(a.id) ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-zinc-300 dark:bg-zinc-600"}`} title={prescribedIds.includes(a.id) ? "Treino já prescrito para hoje" : "Sem treino para hoje"} />
                                                    <span className="truncate flex-1">{a.name}</span>
                                                </div>
                                            </label>
                                        ))}
                                    {athletes.length === 0 && (
                                        <p className="text-center py-4 text-xs text-zinc-400">Carregando atletas...</p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data de Início</label>
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => dateInputRef.current?.showPicker()}
                                >
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatDateToBR(date)}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 cursor-pointer text-sm font-medium"
                                    />
                                    <input
                                        type="date"
                                        ref={dateInputRef}
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-brand-primary transition-colors">
                                        📅
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Templates e Repetição */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Carregar Modelo</label>
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => handleLoadTemplate(e.target.value)}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                >
                                    <option value="">Nenhum modelo selecionado</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Repetir (Semanas)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={repeatWeeks}
                                    onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                />
                            </div>
                        </div>

                        {/* Tipo e Classificação */}
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tipo de Treino</label>
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value);
                                        setClassification("CRM");
                                        setBodyPart("");
                                    }}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                >
                                    <option value="Corrida">Corrida</option>
                                    <option value="Musculação">Musculação</option>
                                    <option value="Funcional">Funcional</option>
                                    <option value="Ciclismo">Ciclismo</option>
                                </select>
                            </div>

                            {type === 'Corrida' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Classificação</label>
                                    <select
                                        value={classification}
                                        onChange={(e) => {
                                            setClassification(e.target.value);
                                            setCustomPercent(0);
                                        }}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    >
                                        <option value="CRM">CRM (Contínuo Rápido Moderado)</option>
                                        <option value="CL">CL (Contínuo Longo)</option>
                                        <option value="Z1">Z1 - Regenerativo</option>
                                        <option value="Z2">Z2 - Aeróbico</option>
                                        <option value="Z3">Z3 - Limiar</option>
                                        <option value="IE">Intervalado Extensivo</option>
                                        <option value="Speed">Velocidade</option>
                                        <option value="Custom">Customizado (% LAN)</option>
                                        <option value="CustomVmax">Customizado (% Vmax)</option>
                                    </select>
                                </div>
                            )}

                            {classification === 'Speed' && type === 'Corrida' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Distância de Referência</label>
                                    <select
                                        value={speedDistance}
                                        onChange={(e) => setSpeedDistance(e.target.value)}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    >
                                        {athleteData?.metrics
                                            ?.filter((m: any) => m.category === 'SPEED')
                                            .map((m: any) => m.exercise)
                                            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index) // Unique
                                            .map((d: string) => (
                                                <option key={d} value={d}>{d}</option>
                                            )) || (
                                                <option value="">Nenhum teste</option>
                                            )}
                                    </select>
                                </div>
                            )}

                            {type === 'Musculação' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Membros</label>
                                    <select
                                        value={bodyPart}
                                        onChange={(e) => setBodyPart(e.target.value as any)}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    >
                                        <option value="">Selecionar Foco</option>
                                        <option value="SUPERIORES">Membros Superiores</option>
                                        <option value="INFERIORES">Membros Inferiores</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {type === 'Musculação' && bodyPart && (
                            <div className="space-y-6 animate-slide-down">
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Adicionar Exercício</label>
                                        <SearchableExerciseSelect
                                            exercises={libraryExercises.filter(ex => {
                                                if (!bodyPart) return true;
                                                const group = bodyPart === 'SUPERIORES' ?
                                                    ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Geral", "Superiores", "Core"] :
                                                    ["Quadríceps", "Posterior", "Glúteos", "Adutores", "Panturrilha", "Inferiores"];
                                                return group.includes(ex.muscles);
                                            })}
                                            selectedExerciseName={selectedExercise}
                                            onSelect={(name) => setSelectedExercise(name)}
                                            placeholder="Escolher exercício..."
                                        />
                                    </div>
                                    <div className="w-24 space-y-2">
                                        <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">% Carga</label>
                                        <input
                                            type="number"
                                            value={weightPercent}
                                            onChange={(e) => setWeightPercent(Number(e.target.value))}
                                            className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 text-center"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddExercise}
                                        type="button"
                                        className="px-6 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold text-brand-primary hover:bg-zinc-200"
                                    >
                                        Adicionar
                                    </button>
                                </div>

                                <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Referência de Força</p>
                                        <p className="font-bold text-zinc-600 dark:text-zinc-300">
                                            {bodyPart === 'SUPERIORES' ? 'Supino' : 'Agachamento'}: {bodyPart === 'SUPERIORES' ? references.supino : references.agachamento} kg (1RM)
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Sugestão de Carga</p>
                                        <p className="text-xl font-bold text-brand-primary">
                                            {((bodyPart === 'SUPERIORES' ? references.supino : references.agachamento) * (weightPercent / 100)).toFixed(1)} kg
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(classification === 'Custom' || classification === 'CustomVmax' || classification === 'Speed') && type === 'Corrida' && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    % da {classification === 'CustomVmax' ? 'Vmax' : classification === 'Speed' ? 'Velocidade' : 'LAN'} desejada
                                </label>
                                <input
                                    type="number"
                                    placeholder="Ex: 95"
                                    value={customPercent || ""}
                                    onChange={(e) => setCustomPercent(Number(e.target.value))}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                />
                            </div>
                        )}

                        {['Z1', 'Z2', 'Z3', 'Z4'].includes(classification) && type === 'Corrida' && (
                            <div className="grid grid-cols-2 gap-4 animate-slide-down">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">% Mínimo (Lento)</label>
                                    <input
                                        type="number"
                                        value={rangeMin}
                                        onChange={(e) => setRangeMin(Number(e.target.value))}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">% Máximo (Rápido)</label>
                                    <input
                                        type="number"
                                        value={rangeMax}
                                        onChange={(e) => setRangeMax(Number(e.target.value))}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Descrição / Instruções</label>
                            <textarea
                                rows={6}
                                placeholder={type === 'Musculação' ? "Adicione exercícios acima ou descreva as séries/repetições aqui." : "Descreva os blocos do treino, aquecimento, etc."}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                            />
                            <p className="text-[10px] text-zinc-500 mt-1 px-2">
                                Dica: Use <code className="bg-zinc-100 dark:bg-zinc-700 px-1 rounded">{"{T:dist:ritmo}"}</code> (ex: {"{T:400:Z3}"}) para ritmos variados.
                                <code className="bg-zinc-100 dark:bg-zinc-700 px-1 rounded ml-2">{"{C:85:Exercicio}"}</code> calcula carga por exercício.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSavingTemplate}
                                        onChange={(e) => {
                                            setIsSavingTemplate(e.target.checked);
                                            if (e.target.checked) setIsUpdatingTemplate(false);
                                        }}
                                        className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary"
                                    />
                                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Salvar como novo modelo</span>
                                </label>

                                {selectedTemplate && (
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isUpdatingTemplate}
                                            onChange={(e) => {
                                                setIsUpdatingTemplate(e.target.checked);
                                                if (e.target.checked) setIsSavingTemplate(false);
                                            }}
                                            className="rounded border-zinc-300 text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Atualizar modelo existente</span>
                                    </label>
                                )}
                            </div>

                            {(isSavingTemplate || isUpdatingTemplate) && (
                                <div className="space-y-2 animate-slide-down">
                                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase ml-1">Nome do Modelo</label>
                                    <input
                                        type="text"
                                        placeholder="Nome do Modelo (ex: Intervalado 400m)"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 text-sm focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    />
                                </div>
                            )}
                        </div>

                        {isUpdatingTemplate && selectedTemplate && (
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    const res = await updateWorkoutTemplateAction(selectedTemplate, {
                                        name: templateName,
                                        type,
                                        description,
                                        prescribedIntensity: intensity || (type === "Musculação" ? (bodyPart === "SUPERIORES" ? "Membros Superiores" : "Membros Inferiores") : ""),
                                    });
                                    if (res.success) {
                                        alert("Modelo atualizado com sucesso!");
                                        getWorkoutTemplatesAction().then(setTemplates);
                                    } else {
                                        alert(res.error || "Erro ao atualizar modelo");
                                    }
                                    setLoading(false);
                                }}
                                disabled={loading || !templateName}
                                type="button"
                                className="w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 py-3 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors border-2 border-dashed border-zinc-200 dark:border-zinc-700"
                            >
                                {loading ? "Processando..." : `Atualizar Modelo: ${templateName}`}
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={loading || selectedAthletes.length === 0}
                            className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Processando..." : (selectedAthletes.length > 1 || repeatWeeks > 1 ? "Prescrever para Todos" : "Prescrever Treino")}
                        </button>
                    </div>
                </div>

                {/* Sidebar com Resumo Fisiológico */}
                <div className="space-y-6">
                    {type === 'Corrida' ? (
                        <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl">
                            <h3 className="text-lg font-bold mb-6">Calculadora de Intensidade</h3>

                            {athleteData ? (
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Resultado Sugerido</p>
                                        <p className="text-2xl font-bold text-brand-primary">{calcIntensity || "---"}</p>
                                    </div>

                                    <div className="pt-6 border-t border-white/10 space-y-4">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] uppercase font-bold text-white/30 ml-1">Distância</span>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        value={calcDistance || ""}
                                                        onChange={(e) => setCalcDistance(Number(e.target.value))}
                                                        className="w-16 sm:w-20 rounded-xl bg-white/5 border-none px-2 py-2 text-sm focus:ring-1 focus:ring-brand-primary text-center"
                                                        placeholder="600"
                                                    />
                                                    <span className="text-[11px] text-white/70 font-bold">m</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-1">
                                                <span className="text-[9px] uppercase font-bold text-white/30 ml-1">Tempo Alvo</span>
                                                <div className="flex items-center gap-1 sm:gap-2 bg-white/10 rounded-xl px-2.5 py-1.5 min-h-[38px]">
                                                    <div className="flex items-baseline gap-1">
                                                        <input
                                                            type="number"
                                                            value={calcMin}
                                                            onChange={(e) => handleTimeChange(Number(e.target.value), calcSec)}
                                                            className="w-8 bg-transparent border-none p-0 text-brand-primary font-bold text-sm text-center focus:ring-0"
                                                        />
                                                        <span className="text-[10px] text-white/40">m</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <input
                                                            type="number"
                                                            value={calcSec}
                                                            onChange={(e) => handleTimeChange(calcMin, Number(e.target.value))}
                                                            className="w-8 bg-transparent border-none p-0 text-brand-primary font-bold text-sm text-center focus:ring-0"
                                                        />
                                                        <span className="text-[10px] text-white/40">s</span>
                                                    </div>
                                                    <button
                                                        onClick={handleAddInterval}
                                                        type="button"
                                                        title="Adicionar tiro ao treino"
                                                        className="size-6 sm:size-7 flex items-center justify-center rounded-lg bg-brand-primary text-zinc-900 hover:scale-110 active:scale-95 transition-transform flex-shrink-0 ml-auto"
                                                    >
                                                        <span className="text-lg font-bold">+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <div className="flex flex-1 items-center gap-1.5 min-w-0">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={calcRest}
                                                        onChange={(e) => setCalcRest(e.target.value)}
                                                        className="w-full rounded-xl bg-white/5 border-none px-3 py-2 text-xs focus:ring-1 focus:ring-brand-primary text-center"
                                                        placeholder="Descanso (ex: 1'00'')"
                                                    />
                                                    <span className="absolute -top-4 left-1 text-[9px] text-white/40 font-bold uppercase tracking-wider">Intervalo</span>
                                                </div>
                                                <button
                                                    onClick={handleAddRest}
                                                    type="button"
                                                    title="Adicionar descanso ao treino"
                                                    className="size-[38px] flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all flex-shrink-0"
                                                >
                                                    <span className="text-lg font-bold">⏱</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/10 space-y-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-white/60">Vmax do Aluno</span>
                                                <span className="font-bold">{athleteData.metrics.find((m: any) => m.category === 'AEROBIC')?.vmax?.toFixed(1) || "0"} km/h</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-white/60">LAN (89% VM)</span>
                                                <span className="font-bold text-brand-secondary">
                                                    {athleteData.metrics.find((m: any) => m.category === 'AEROBIC')?.vmax
                                                        ? (athleteData.metrics.find((m: any) => m.category === 'AEROBIC').vmax * 0.89).toFixed(1)
                                                        : "0"
                                                    } km/h
                                                </span>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-white/5 p-4 text-xs text-white/60">
                                            <p>💡 CRM usa 97% da LAN por padrão.</p>
                                            <p className="mt-1">💡 CL usa 92% da LAN por padrão.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-white/40 text-sm text-center py-10">
                                    Selecione um atleta para ver os cálculos de intensidade.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                            <h3 className="text-lg font-bold mb-4">Dicas de Musculação</h3>
                            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                                <div className="flex gap-3">
                                    <span className="text-brand-primary">🎯</span>
                                    <p>Para corredores, foque em <b>Treino de Força Reativa</b> e estabilidade de core.</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-brand-secondary">⚡</span>
                                    <p>Membros inferiores: Carga baseada no Agachamento ({references.agachamento}kg).</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="text-purple-500">💪</span>
                                    <p>Membros superiores: Carga baseada no Supino ({references.supino}kg).</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
