"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAthleteAction } from "@/app/actions/athletes";
import { getWorkoutDetailAction, updateWorkoutAction } from "@/app/actions/workouts";
import { kmhParaPace, calcularVelocidadePorClassificacao, ZONAS_CONFIG } from "@/lib/calculos";

const EXERCICIOS_BASE = {
    SUPERIORES: [
        "Supino Reto", "Peck Deck", "Desenvolvimento", "Elevação Lateral",
        "Puxada Aberta", "Remada Curvada", "Rosca Direta", "Tríceps Pulley",
        "Flexão de Braços", "Remada Baixa"
    ],
    INFERIORES: [
        "Agachamento Livre", "Leg Press 45", "Cadeira Extensora", "Mesa Flexora",
        "Afundo", "Panturrilha Sentado", "Levantamento Terra", "Cadeira Adutora",
        "Cadeira Abdutora", "Stiff"
    ]
};

export default function EditarPlanilhaPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [athleteData, setAthleteData] = useState<any>(null);

    // Form data
    const [date, setDate] = useState("");
    const [type, setType] = useState("Corrida");
    const [classification, setClassification] = useState("CRM");
    const [bodyPart, setBodyPart] = useState<"SUPERIORES" | "INFERIORES" | "">("");
    const [selectedExercise, setSelectedExercise] = useState("");
    const [weightPercent, setWeightPercent] = useState<number>(85);
    const [customPercent, setCustomPercent] = useState<number>(0);
    const [speedDistance, setSpeedDistance] = useState("30m");
    const [description, setDescription] = useState("");
    const [intensity, setIntensity] = useState("");
    const [rangeMin, setRangeMin] = useState<number>(0);
    const [rangeMax, setRangeMax] = useState<number>(0);

    // References for weight
    const [references, setReferences] = useState({ supino: 0, agachamento: 0 });

    // Calculator state
    const [calcDistance, setCalcDistance] = useState<number>(600);
    const [calcMin, setCalcMin] = useState<number>(0);
    const [calcSec, setCalcSec] = useState<number>(0);
    const [isManualTime, setIsManualTime] = useState(false);
    const [calcRest, setCalcRest] = useState<string>("1'00\"");
    const [currentPaceSeconds, setCurrentPaceSeconds] = useState<number>(0);
    const dateInputRef = useRef<HTMLInputElement>(null);

    const formatDateToBR = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };
    useEffect(() => {
        if (id) {
            getWorkoutDetailAction(id as string).then(async (workout) => {
                if (workout) {
                    // Convert date back to YYYY-MM-DD for input
                    const rawDate = new Date(workout.date.split('/').reverse().join('-'));
                    setDate(rawDate.toISOString().split('T')[0]);
                    setType(workout.type);
                    setDescription(workout.description);
                    setIntensity(workout.prescribedIntensity);

                    // Try to guess classification from intensity string
                    const intensityStr = workout.prescribedIntensity;
                    if (intensityStr.includes("(CRM)") || intensityStr.includes("97%")) {
                        setClassification("CRM");
                    } else if (intensityStr.includes("(CL)") || intensityStr.includes("92%")) {
                        setClassification("CL");
                    } else if (intensityStr.includes("(Z1)") || intensityStr.includes("65%")) {
                        setClassification("Z1");
                    } else if (intensityStr.includes("(Z2)") || intensityStr.includes("75%")) {
                        setClassification("Z2");
                    } else if (intensityStr.includes("(Z3)") || intensityStr.includes("85%")) {
                        setClassification("Z3");
                    } else if (intensityStr.includes("(IE)") || intensityStr.includes("95%")) {
                        setClassification("IE");
                    } else if (intensityStr.includes("Velocidade") || intensityStr.includes("(Speed)")) {
                        setClassification("Speed");
                        const distMatch = intensityStr.match(/Velocidade ([\d\w]+)/) || intensityStr.match(/\(Speed\) ([\d\w]+)/);
                        if (distMatch) setSpeedDistance(distMatch[1]);
                        const pctMatch = intensityStr.match(/\((\d+)%/);
                        if (pctMatch) setCustomPercent(Number(pctMatch[1]));
                    } else if (intensityStr.includes("Vmax")) {
                        setClassification("CustomVmax");
                        const pctMatch = intensityStr.match(/\((\d+)%/);
                        if (pctMatch) setCustomPercent(Number(pctMatch[1]));
                    } else {
                        const pctMatch = intensityStr.match(/\((\d+)%/);
                        if (pctMatch) {
                            setClassification("Custom");
                            setCustomPercent(Number(pctMatch[1]));
                        } else {
                            // Fallback para o que estiver no banco
                            setClassification("CRM");
                        }
                    }

                    // Tentar extrair faixa de porcentagem (ex: Z1: 60-70%)
                    const rangeMatch = intensityStr.match(/(\d+)-(\d+)%/);
                    if (rangeMatch) {
                        setRangeMin(Number(rangeMatch[1]));
                        setRangeMax(Number(rangeMatch[2]));
                    }

                    const athlete = await getAthleteAction(workout.athleteProfileId);
                    setAthleteData(athlete);

                    // Buscar referências de força
                    const metrics = athlete?.metrics || [];
                    const supino = metrics.find((m: any) => m.exercise?.toLowerCase().includes("supino"))?.result || 0;
                    const agacho = metrics.find((m: any) => m.exercise?.toLowerCase().includes("agachamento"))?.result || 0;
                    setReferences({ supino, agachamento: agacho });

                    // Garantir que a distância selecionada é válida para o atleta (caso venha do workout com distância não testada em métricas recentes)
                    const athleteSpeeds = metrics.filter((m: any) => m.category === 'SPEED').map((m: any) => m.exercise);
                    if (athleteSpeeds.length > 0 && !athleteSpeeds.includes(speedDistance)) {
                        setSpeedDistance(athleteSpeeds[0]);
                    }

                    // Tentar extrair distância do primeiro tiro para o calculador
                    const distMatch = workout.description.match(/(?:Tiro|Tiros) de (\d+)m/i);
                    if (distMatch) {
                        setCalcDistance(Number(distMatch[1]));
                    }

                    setLoading(false);
                }
            });
        }
    }, [id]);

    useEffect(() => {
        if (['Z1', 'Z2', 'Z3', 'Z4'].includes(classification)) {
            if (rangeMin === 0 && rangeMax === 0) {
                if (classification === 'Z1') { setRangeMin(ZONAS_CONFIG.REGENERATIVO.min * 100); setRangeMax(ZONAS_CONFIG.REGENERATIVO.max * 100); }
                else if (classification === 'Z2') { setRangeMin(ZONAS_CONFIG.AEROBICO.min * 100); setRangeMax(ZONAS_CONFIG.AEROBICO.max * 100); }
                else if (classification === 'Z3') { setRangeMin(ZONAS_CONFIG.LIMIAR.min * 100); setRangeMax(ZONAS_CONFIG.LIMIAR.max * 100); }
                else if (classification === 'Z4') { setRangeMin(ZONAS_CONFIG.ANAEROBICO.min * 100); setRangeMax(ZONAS_CONFIG.ANAEROBICO.max * 100); }
            }
        } else {
            setRangeMin(0);
            setRangeMax(0);
        }
    }, [classification]);

    const updateIntensity = (vmax: number, cls: string, manual: number) => {
        if (['Z1', 'Z2', 'Z3', 'Z4'].includes(cls) && rangeMin > 0 && rangeMax > 0) {
            const speedMin = calcularVelocidadePorClassificacao(vmax, cls, rangeMin);
            const speedMax = calcularVelocidadePorClassificacao(vmax, cls, rangeMax);
            const paceMin = kmhParaPace(speedMin);
            const paceMax = kmhParaPace(speedMax);
            setIntensity(`Ritmo ${paceMax} a ${paceMin} min/km (${cls}: ${rangeMin}-${rangeMax}%)`);
            setCurrentPaceSeconds(speedMax > 0 ? 3600 / speedMax : 0);
            return;
        }

        const vel = calcularVelocidadePorClassificacao(vmax, cls, manual || undefined);
        const pace = kmhParaPace(vel);

        if (vel > 0) {
            const paceSec = 3600 / vel;
            setCurrentPaceSeconds(paceSec);
        } else {
            setCurrentPaceSeconds(0);
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
        setIntensity(`Ritmo ${pace} min/km ${label}`);
    };

    useEffect(() => {
        if (type === 'Corrida' && athleteData) {
            const metrics = athleteData.metrics || [];
            const latestAerobic = metrics.find((m: any) => m.category === 'AEROBIC');
            const latestSpeed = metrics.find((m: any) => m.category === 'SPEED' && m.exercise === speedDistance);

            const baseVmax = classification === 'Speed' ? latestSpeed?.vmax : latestAerobic?.vmax;

            if (baseVmax) {
                updateIntensity(baseVmax, classification, customPercent);
            } else {
                setIntensity(classification === 'Speed' ? `Sem teste de velocidade ${speedDistance}` : "Sem teste aeróbico");
            }
        }
    }, [classification, customPercent, type, athleteData, speedDistance, rangeMin, rangeMax]);

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

        setTimeout(() => setIsManualTime(false), 100);
    };

    const handleAddExercise = () => {
        if (!selectedExercise) return;

        let cargaStr = "";
        if (type === 'Musculação' && bodyPart) {
            const ref = bodyPart === 'SUPERIORES' ? references.supino : references.agachamento;
            if (ref > 0) {
                const carga = (ref * (weightPercent / 100)).toFixed(1);
                cargaStr = ` [${carga}kg - ${weightPercent}%]`;
            }
        }

        const newText = description
            ? `${description}\n- ${selectedExercise}: 3x12${cargaStr}`
            : `- ${selectedExercise}: 3x12${cargaStr}`;
        setDescription(newText);
        setSelectedExercise("");
    };

    const handleAddInterval = () => {
        if (calcDistance <= 0) return;

        const timeStr = calcMin > 0
            ? `${calcMin}m ${calcSec < 10 ? "0" : ""}${calcSec}s`
            : `${calcSec}s`;

        // Usar tags para consistência e suporte a auditoria/recalculo futuro
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
        if (!description) { setDescription(`- ${intervalText}`); return; }
        const lastChar = description[description.length - 1];
        if (lastChar === '\n') setDescription(description + `- ${intervalText}`);
        else setDescription(description + ' ' + intervalText);
    };
    const handleAddRest = () => {
        if (!calcRest) return;
        const restText = `int. ${calcRest}`;
        if (!description) { setDescription(restText); return; }
        const lastChar = description[description.length - 1];
        if (lastChar === '\n') setDescription(description + restText);
        else setDescription(description + ' ' + restText);
    };

    const handleSave = async () => {
        if (!description) return;
        setSaving(true);

        const res = await updateWorkoutAction(id as string, {
            date,
            type,
            description,
            prescribedIntensity: intensity || (type === "Musculação" ? (bodyPart === "SUPERIORES" ? "Membros Superiores" : "Membros Inferiores") : "")
        });

        if (res.success) {
            router.push(`/dashboard/planilhas/${id}`);
        } else {
            alert(res.error || "Erro ao atualizar planilha");
            setSaving(false);
        }
    };

    if (loading) return <div className="py-20 text-center text-zinc-500">Carregando treino...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Editar <span className="text-gradient">Planilha</span>
                    </h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Ajuste a prescrição para <b>{athleteData?.user?.name}</b>.
                    </p>
                </div>
                <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-900 font-medium">
                    Cancelar
                </button>
            </header>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data do Treino</label>
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
                        </div>

                        {type === 'Corrida' && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Classificação</label>
                                <select
                                    value={classification}
                                    onChange={(e) => setClassification(e.target.value)}
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
                            <div className="space-y-2 animate-slide-down">
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

                        {type === 'Corrida' && (classification === 'Custom' || classification === 'CustomVmax' || classification === 'Speed') && (
                            <div className="space-y-2 animate-slide-down">
                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    % da {classification === 'CustomVmax' ? 'Vmax' : classification === 'Speed' ? 'Velocidade' : 'LAN'}
                                </label>
                                <input
                                    type="number"
                                    value={customPercent || ""}
                                    onChange={(e) => setCustomPercent(Number(e.target.value))}
                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                    placeholder="Ex: 100"
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

                        {type === 'Musculação' && (
                            <div className="space-y-6 animate-slide-down">
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

                                {bodyPart && (
                                    <div className="space-y-6">
                                        <div className="flex gap-4 items-end">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Adicionar Exercício</label>
                                                <select
                                                    value={selectedExercise}
                                                    onChange={(e) => setSelectedExercise(e.target.value)}
                                                    className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800"
                                                >
                                                    <option value="">Escolher exercício...</option>
                                                    {EXERCICIOS_BASE[bodyPart].map(ex => (
                                                        <option key={ex} value={ex}>{ex}</option>
                                                    ))}
                                                </select>
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
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Descrição / Instruções</label>
                            <textarea
                                rows={8}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 focus:ring-2 focus:ring-brand-primary dark:bg-zinc-800 font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full rounded-2xl premium-gradient py-4 font-bold text-white shadow-lg shadow-brand-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {saving ? "Salvando..." : "Atualizar Treino"}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {type === 'Corrida' && (
                        <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl">
                            <h3 className="text-lg font-bold mb-6">Calculadora</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Ritmo Calculado</p>
                                    <p className="text-xl font-bold text-brand-primary">{intensity}</p>
                                </div>

                                <div className="pt-6 border-t border-white/10 space-y-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-bold text-white/30 ml-1">Distância</span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <input
                                                    type="number"
                                                    value={calcDistance || ""}
                                                    onChange={(e) => setCalcDistance(Number(e.target.value))}
                                                    className="w-16 rounded-xl bg-white/5 border-none px-2 py-2 text-sm text-center focus:ring-1 focus:ring-brand-primary"
                                                />
                                                <span className="text-[11px] text-white/70 font-bold">m</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1">
                                            <span className="text-[9px] uppercase font-bold text-white/30 ml-1">Tempo Alvo</span>
                                            <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2.5 py-1.5 min-h-[38px]">
                                                <div className="flex items-baseline gap-1">
                                                    <input
                                                        type="number"
                                                        value={calcMin}
                                                        onChange={(e) => handleTimeChange(Number(e.target.value), calcSec)}
                                                        className="w-7 bg-transparent border-none p-0 text-brand-primary font-bold text-xs text-center focus:ring-0"
                                                    />
                                                    <span className="text-[9px] text-white/40">m</span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <input
                                                        type="number"
                                                        value={calcSec}
                                                        onChange={(e) => handleTimeChange(calcMin, Number(e.target.value))}
                                                        className="w-7 bg-transparent border-none p-0 text-brand-primary font-bold text-xs text-center focus:ring-0"
                                                    />
                                                    <span className="text-[9px] text-white/40">s</span>
                                                </div>
                                                <button onClick={handleAddInterval} className="size-6 bg-brand-primary text-zinc-900 rounded-lg font-bold ml-auto">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={calcRest}
                                                onChange={(e) => setCalcRest(e.target.value)}
                                                className="w-full rounded-xl bg-white/5 border-none px-3 py-2 text-xs text-center"
                                            />
                                            <span className="absolute -top-4 left-1 text-[9px] text-white/40 font-bold uppercase tracking-wider">Intervalo</span>
                                        </div>
                                        <button onClick={handleAddRest} className="size-[38px] bg-white/10 rounded-xl text-lg">⏱</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
