"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAthleteAction } from "@/app/actions/athletes";
import { getWorkoutDetailAction, updateWorkoutAction } from "@/app/actions/workouts";
import { getExercisesAction } from "@/app/actions/exercises";
import { kmhParaPace, calcularVelocidadePorClassificacao, ZONAS_CONFIG } from "@/lib/calculos";


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
    const [libraryExercises, setLibraryExercises] = useState<any[]>([]);
    const [selectedWorkoutExercises, setSelectedWorkoutExercises] = useState<any[]>([]);

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
        getExercisesAction().then(setLibraryExercises);
    }, []);

    useEffect(() => {
        if (id) {
            getWorkoutDetailAction(id as string).then(async (workout) => {
                if (workout) {
                    const rawDate = new Date(workout.date);
                    setDate(rawDate.toISOString().split('T')[0]);
                    setType(workout.type);
                    setDescription(workout.description);
                    setIntensity(workout.prescribedIntensity);

                    // Try to guess classification from intensity string
                    const intensityStr = workout.prescribedIntensity;
                    if (intensityStr.includes("(CRM)") || intensityStr.includes("97%")) setClassification("CRM");
                    else if (intensityStr.includes("(CL)") || intensityStr.includes("92%")) setClassification("CL");
                    else if (intensityStr.includes("(Z1)") || intensityStr.includes("65%")) setClassification("Z1");
                    else if (intensityStr.includes("(Z2)") || intensityStr.includes("75%")) setClassification("Z2");
                    else if (intensityStr.includes("(Z3)") || intensityStr.includes("85%")) setClassification("Z3");
                    else if (intensityStr.includes("(IE)") || intensityStr.includes("95%")) setClassification("IE");
                    else if (intensityStr.includes("Velocidade") || intensityStr.includes("(Speed)")) {
                        setClassification("Speed");
                        const distMatch = intensityStr.match(/Velocidade ([\d\w]+)/) || intensityStr.match(/\(Speed\) ([\d\w]+)/);
                        if (distMatch) setSpeedDistance(distMatch[1]);
                    } else if (intensityStr.includes("Vmax")) setClassification("CustomVmax");

                    const athlete = await getAthleteAction(workout.athleteProfileId);
                    setAthleteData(athlete);

                    const metrics = athlete?.metrics || [];
                    const supino = metrics.find((m: any) => m.exercise?.toLowerCase().includes("supino"))?.result || 0;
                    const agacho = metrics.find((m: any) => m.exercise?.toLowerCase().includes("agachamento"))?.result || 0;
                    setReferences({ supino, agachamento: agacho });

                    // Populate selectedWorkoutExercises
                    if ((workout as any).exercises) {
                        setSelectedWorkoutExercises((workout as any).exercises.map((we: any) => ({
                            exerciseId: we.exerciseId,
                            sets: we.sets || 3,
                            reps: we.reps || 12,
                            weight: we.weight || 0,
                            name: we.exercise.name
                        })));
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
            const speedMin = (vmax * (rangeMin / 100));
            const speedMax = (vmax * (rangeMax / 100));
            const paceMin = kmhParaPace(speedMin);
            const paceMax = kmhParaPace(speedMax);
            setIntensity(`Ritmo ${paceMax} a ${paceMin} min/km (${cls}: ${rangeMin}-${rangeMax}%)`);
            setCurrentPaceSeconds(speedMax > 0 ? 3600 / speedMax : 0);
            return;
        }

        const vel = (vmax * ((manual || 100) / 100));
        const pace = kmhParaPace(vel);
        setCurrentPaceSeconds(vel > 0 ? 3600 / vel : 0);

        let label = manual ? `(${manual}% da ${cls})` : `(${cls})`;
        setIntensity(`Ritmo ${pace} min/km ${label}`);
    };

    useEffect(() => {
        if (type === 'Corrida' && athleteData) {
            const metrics = athleteData.metrics || [];
            const aerobic = metrics.find((m: any) => m.category === 'AEROBIC');
            const vmax = aerobic?.calculatedVmax || 0;
            if (vmax) updateIntensity(vmax, classification, customPercent);
        }
    }, [classification, customPercent, type, athleteData, rangeMin, rangeMax]);

    useEffect(() => {
        if (currentPaceSeconds > 0 && calcDistance > 0 && !isManualTime) {
            const totalSeconds = (currentPaceSeconds * calcDistance) / 1000;
            setCalcMin(Math.floor(totalSeconds / 60));
            setCalcSec(Math.round(totalSeconds % 60));
        }
    }, [currentPaceSeconds, calcDistance, isManualTime]);

    const handleTimeChange = (m: number, s: number) => {
        setIsManualTime(true);
        setCalcMin(m);
        setCalcSec(s);
        if (currentPaceSeconds > 0) {
            setCalcDistance(Math.round(((m * 60) + s) * 1000 / currentPaceSeconds));
        }
        setTimeout(() => setIsManualTime(false), 100);
    };

    const handleAddExercise = () => {
        if (!selectedExercise) return;
        const exerciseData = libraryExercises.find(ex => ex.name === selectedExercise);
        if (exerciseData) {
            setSelectedWorkoutExercises(prev => [...prev, {
                exerciseId: exerciseData.id,
                sets: 3,
                reps: 12,
                weight: parseFloat(((bodyPart === 'SUPERIORES' ? references.supino : references.agachamento) * (weightPercent / 100)).toFixed(1)),
                name: selectedExercise
            }]);
        }
        const ref = bodyPart === 'SUPERIORES' ? references.supino : references.agachamento;
        const carga = ref > 0 ? ` [${(ref * (weightPercent / 100)).toFixed(1)}kg - ${weightPercent}%]` : "";
        setDescription(prev => (prev ? prev + "\n" : "") + `- ${selectedExercise}: 3x12${carga}`);
        setSelectedExercise("");
    };

    const handleAddInterval = () => {
        if (calcDistance <= 0) return;
        const intervalText = `Tiro de ${calcDistance}m: {T:${calcDistance}:${classification}}`;
        setDescription(prev => (prev ? prev + " " : "") + intervalText);
    };

    const handleAddRest = () => {
        if (!calcRest) return;
        setDescription(prev => (prev ? prev + " " : "") + `int. ${calcRest}`);
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateWorkoutAction(id as string, {
            date,
            type,
            description,
            prescribedIntensity: intensity,
            exercises: type === "Musculação" ? selectedWorkoutExercises : undefined
        });
        if (res.success) router.push(`/dashboard/planilhas/${id}`);
        else { alert(res.error || "Erro ao atualizar"); setSaving(false); }
    };

    if (loading) return <div className="py-20 text-center">Carregando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            <header className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Editar Planilha</h1>
                <button onClick={() => router.back()} className="text-zinc-500">Cancelar</button>
            </header>

            <div className="rounded-3xl bg-white p-8 shadow-sm dark:bg-zinc-900 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-bold">Data</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 dark:bg-zinc-800" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold">Tipo</label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 dark:bg-zinc-800">
                            <option value="Corrida">Corrida</option>
                            <option value="Musculação">Musculação</option>
                        </select>
                    </div>
                </div>

                {type === 'Musculação' && (
                    <div className="space-y-4">
                        <select value={bodyPart} onChange={(e) => setBodyPart(e.target.value as any)} className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 dark:bg-zinc-800">
                            <option value="">Foco...</option>
                            <option value="SUPERIORES">Superiores</option>
                            <option value="INFERIORES">Inferiores</option>
                        </select>
                        {bodyPart && (
                            <div className="flex gap-2">
                                <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="flex-1 rounded-2xl bg-zinc-50 border-none px-4 py-3 dark:bg-zinc-800">
                                    <option value="">Exercício...</option>
                                    {libraryExercises
                                        .filter(ex => {
                                            if (!bodyPart) return true;
                                            const group = bodyPart === 'SUPERIORES' ?
                                                ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Geral", "Superiores", "Core"] :
                                                ["Quadríceps", "Posterior", "Glúteos", "Adutores", "Panturrilha", "Inferiores"];
                                            return group.includes(ex.muscles);
                                        })
                                        .map(ex => <option key={ex.id} value={ex.name}>{ex.name}</option>)
                                    }
                                </select>
                                <button onClick={handleAddExercise} className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold">Add</button>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-bold">Descrição</label>
                    <textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-2xl bg-zinc-50 border-none px-4 py-3 dark:bg-zinc-800 font-mono" />
                </div>

                <button onClick={handleSave} disabled={saving} className="w-full rounded-2xl premium-gradient py-4 font-bold text-white">
                    {saving ? "Salvando..." : "Atualizar Treino"}
                </button>
            </div>
        </div>
    );
}
