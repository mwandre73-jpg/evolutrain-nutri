"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calcularVelocidadePorClassificacao, kmhParaPace } from "@/lib/calculos";

export async function saveWorkoutAction(data: {
    athleteProfileIds: string[];
    date: string;
    type: string;
    description: string;
    prescribedIntensity: string;
    calculatedZones?: string;
    repeatWeeks?: number;
    classification?: string;
    customPercent?: number;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const workouts = [];
        const baseDate = new Date(data.date + 'T12:00:00');
        const count = data.repeatWeeks || 1;

        for (const athleteId of data.athleteProfileIds) {
            // Buscar dados fisiológicos do atleta para individualização
            const athlete = await prisma.athleteProfile.findUnique({
                where: { id: athleteId },
                include: { metrics: { orderBy: { date: 'desc' } } }
            });

            let individualizedDescription = data.description;
            let individualizedIntensity = data.prescribedIntensity;

            if (athlete && athlete.metrics && data.type === 'Corrida') {
                const aerobicMetric = athlete.metrics.find((m: any) => m.category === 'AEROBIC');
                const speedMetrics = athlete.metrics.filter((m: any) => m.category === 'SPEED');

                // Substituir placeholders de tempo: {T:distancia:classificacao:percentual(ou min-max):distancia_referencia}
                individualizedDescription = individualizedDescription.replace(/\{T:(\d+)(?::([^:}]+))?(?::(\d+(?:-\d+)?))?(?::([^:}]+))?\}/g, (match, dist, overrideClass, overridePct, overrideRef) => {
                    const d = parseInt(dist);
                    const cls = overrideClass || data.classification || 'CRM';
                    const pctValue = overridePct || (overrideClass ? undefined : data.customPercent?.toString());
                    const refDist = overrideRef;

                    let vmax = aerobicMetric?.calculatedVmax || 0;

                    if (cls === 'Speed') {
                        const searchDist = refDist || `${d}m`;
                        const speedMetric = speedMetrics.find((m: any) => m.exercise === searchDist) || speedMetrics[0];
                        if (speedMetric) vmax = (speedMetric as any).calculatedVmax || 0;
                    }

                    // Se for uma faixa (ex: 60-70)
                    if (pctValue && pctValue.includes('-')) {
                        const [minPct, maxPct] = pctValue.split('-').map(Number);
                        const speedMin = calcularVelocidadePorClassificacao(vmax, cls, minPct);
                        const speedMax = calcularVelocidadePorClassificacao(vmax, cls, maxPct);

                        const paceMin = speedMin > 0 ? kmhParaPace(speedMin) : "0:00";
                        const paceMax = speedMax > 0 ? kmhParaPace(speedMax) : "0:00";

                        // Retorna como "PACE_LENTO a PACE_RAPIDO"
                        // kmh maior -> pace menor (mais rápido)
                        return `${paceMax} a ${paceMin}`;
                    }

                    const pct = pctValue ? Number(pctValue) : undefined;
                    const speed = calcularVelocidadePorClassificacao(vmax, cls, pct);
                    const paceSecs = speed > 0 ? 3600 / speed : 0;

                    const totalSeconds = (paceSecs * d) / 1000;
                    const m = Math.floor(totalSeconds / 60);
                    const s = Math.round(totalSeconds % 60);

                    if (m === 0) return `${s}s`;
                    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
                });

                // Para o [PACE] global, usamos as configurações do form
                let globalVmax = aerobicMetric?.calculatedVmax || 0;
                if (data.classification === 'Speed') {
                    // Aqui não temos a distância de referência no data, mas podemos tentar pegar a mais comum ou a primeira
                    const speedMetric = speedMetrics[0];
                    if (speedMetric) globalVmax = (speedMetric as any).calculatedVmax || 0;
                }
                const globalSpeed = calcularVelocidadePorClassificacao(globalVmax, data.classification || 'CRM', data.customPercent);
                const globalPaceStr = kmhParaPace(globalSpeed);

                if (individualizedIntensity.includes('[PACE]')) {
                    individualizedIntensity = individualizedIntensity.replace('[PACE]', globalPaceStr);
                } else if (data.athleteProfileIds.length > 1 && (individualizedIntensity === "Vários atletas selecionados" || !individualizedIntensity)) {
                    individualizedIntensity = `Ritmo ${globalPaceStr} min/km (${data.classification || 'CRM'})`;
                }
            }

            // Individualização para Musculação
            if (athlete && athlete.metrics && data.type === 'Musculação') {
                // Suporte para {C:percentual:exercicio_referencia}
                individualizedDescription = individualizedDescription.replace(/\{C:(\d+)(?::([^:}]+))?\}/g, (match, percent, exerciseHint) => {
                    const p = parseInt(percent);
                    let loadRef = 0;

                    // 1. Tentar busca por exercício específico
                    if (exerciseHint) {
                        const specificMetric = athlete.metrics.find((m: any) =>
                            m.category === 'STRENGTH' &&
                            m.exercise?.toLowerCase().includes(exerciseHint.toLowerCase())
                        );
                        if (specificMetric) loadRef = specificMetric.rawResult;
                    }

                    // 2. Fallback para heurística Superior/Inferior
                    if (!loadRef) {
                        const isSuperiores = individualizedIntensity.toLowerCase().includes('superior') ||
                            (exerciseHint && ['supino', 'ombro', 'triceps', 'peito', 'costas'].some((h: any) => exerciseHint.toLowerCase().includes(h)));
                        const refType = isSuperiores ? 'supino' : 'agachamento';
                        const refMetric = athlete.metrics.find((m: any) => m.exercise?.toLowerCase().includes(refType));
                        if (refMetric) loadRef = refMetric.rawResult;
                    }

                    if (loadRef > 0) {
                        const load = (loadRef * (p / 100)).toFixed(1);
                        return `${load}kg (${p}%)`;
                    }
                    return `${p}%`;
                });
            }

            for (let i = 0; i < count; i++) {
                const targetDate = new Date(baseDate);
                targetDate.setDate(baseDate.getDate() + (i * 7));

                const workout = await prisma.workouts.create({
                    data: {
                        id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        athleteProfileId: athleteId,
                        date: targetDate,
                        type: data.type,
                        description: individualizedDescription,
                        prescribedIntensity: individualizedIntensity,
                        calculatedZones: data.calculatedZones,
                        completed: false
                    }
                });
                workouts.push(workout);
            }
        }

        revalidatePath("/dashboard/planilhas");
        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/planilhas`);

        return { success: true, count: workouts.length };
    } catch (error) {
        console.error("Error saving workout:", error);
        return { success: false, error: "Falha ao salvar treino" };
    }
}

export async function getWorkoutsAction() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error("Unauthorized");
        }

        const where = session.user.role === "COACH"
            ? {
                athlete: {
                    coachId: session.user.id,
                    NOT: { userId: session.user.id } // Ocultar treinos do próprio treinador da lista geral
                }
            }
            : { athleteProfileId: session.user.id };

        const workouts = await prisma.workouts.findMany({
            where: where as any,
            include: {
                athlete: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        return workouts.map((w: any) => ({
            id: w.id,
            date: new Date(w.date).toLocaleDateString('pt-BR'),
            athleteName: (w.athlete as any)?.user?.name || "Atleta",
            type: w.type,
            intensity: w.prescribedIntensity,
            completed: w.completed
        }));
    } catch (error) {
        console.error("Error fetching workouts:", error);
        return [];
    }
}

export async function getCoachSelfWorkoutsAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return [];

        const workouts = await prisma.workouts.findMany({
            where: {
                athlete: { userId: session.user.id }
            },
            orderBy: { date: 'desc' },
            take: 10
        });

        return workouts.map((w: any) => ({
            id: w.id,
            date: new Date(w.date).toLocaleDateString('pt-BR'),
            type: w.type,
            intensity: w.prescribedIntensity,
            completed: w.completed
        }));
    } catch (error) {
        console.error("Error fetching self workouts:", error);
        return [];
    }
}

export async function getWorkoutDetailAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const workout = await prisma.workouts.findUnique({
            where: { id },
            include: {
                athlete: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!workout) return null;

        // Se o coach estiver visualizando e houver feedback não lido, marcar como lido
        if (session.user.role === "COACH" && (workout as any).feedbackText && !(workout as any).feedbackRead) {
            await (prisma.workouts as any).update({
                where: { id },
                data: { feedbackRead: true }
            });
            revalidatePath("/dashboard"); // Atualizar alert count no dashboard
        }

        return {
            ...workout,
            date: new Date(workout.date).toLocaleDateString('pt-BR'),
            athleteName: (workout.athlete as any)?.user?.name || "Atleta"
        };
    } catch (error) {
        console.error("Error fetching workout detail:", error);
        return null;
    }
}

export async function markWorkoutAsCompletedAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        await prisma.workouts.update({
            where: { id },
            data: { completed: true }
        });

        revalidatePath("/dashboard/planilhas");
        revalidatePath(`/dashboard/planilhas/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Error completing workout:", error);
        return { success: false };
    }
}

export async function updateWorkoutAction(id: string, data: {
    date: string;
    type: string;
    description: string;
    prescribedIntensity: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        // Buscar dados do atleta para individualização (tags)
        const existingWorkout = await prisma.workouts.findUnique({
            where: { id },
            select: { athleteProfileId: true }
        });

        let individualizedDescription = data.description;
        if (existingWorkout && data.type === 'Corrida') {
            const athlete = await prisma.athleteProfile.findUnique({
                where: { id: existingWorkout.athleteProfileId },
                include: { metrics: { orderBy: { date: 'desc' } } }
            });

            if (athlete) {
                const aerobicMetric = athlete.metrics.find((m: any) => m.category === 'AEROBIC');
                const speedMetrics = athlete.metrics.filter((m: any) => m.category === 'SPEED');

                individualizedDescription = individualizedDescription.replace(/\{T:(\d+)(?::([^:}]+))?(?::(\d+(?:-\d+)?))?(?::([^:}]+))?\}/g, (match, dist, overrideClass, overridePct, overrideRef) => {
                    const d = parseInt(dist);
                    const cls = overrideClass || 'CRM';
                    const pctValue = overridePct;
                    const refDist = overrideRef;

                    let vmax = aerobicMetric?.calculatedVmax || 0;
                    if (cls === 'Speed') {
                        const searchDist = refDist || `${d}m`;
                        const speedMetric = speedMetrics.find((m: any) => m.exercise === searchDist) || speedMetrics[0];
                        if (speedMetric) vmax = (speedMetric as any).calculatedVmax || 0;
                    }

                    if (pctValue && pctValue.includes('-')) {
                        const [minPct, maxPct] = pctValue.split('-').map(Number);
                        const speedMin = calcularVelocidadePorClassificacao(vmax, cls, minPct);
                        const speedMax = calcularVelocidadePorClassificacao(vmax, cls, maxPct);

                        const paceMin = speedMin > 0 ? kmhParaPace(speedMin) : "0:00";
                        const paceMax = speedMax > 0 ? kmhParaPace(speedMax) : "0:00";

                        return `${paceMax} a ${paceMin}`;
                    }

                    const pct = pctValue ? Number(pctValue) : undefined;
                    const speed = calcularVelocidadePorClassificacao(vmax, cls, pct);
                    const paceSecs = speed > 0 ? 3600 / speed : 0;
                    const totalSeconds = (paceSecs * d) / 1000;
                    const m = Math.floor(totalSeconds / 60);
                    const s = Math.round(totalSeconds % 60);

                    if (m === 0) return `${s}s`;
                    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
                });
            }
        }

        await prisma.workouts.update({
            where: { id },
            data: {
                date: new Date(data.date + 'T12:00:00'),
                type: data.type,
                description: individualizedDescription,
                prescribedIntensity: data.prescribedIntensity
            }
        });

        revalidatePath("/dashboard/planilhas");
        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/planilhas/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating workout:", error);
        return { success: false, error: "Falha ao atualizar treino" };
    }
}

export async function deleteWorkoutAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        await prisma.workouts.delete({
            where: { id }
        });

        revalidatePath("/dashboard/planilhas");
        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error deleting workout:", error);
        return { success: false, error: "Falha ao excluir treino" };
    }
}
export async function saveWorkoutFeedbackAction(id: string, data: {
    perception: number;
    text: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        await (prisma.workouts as any).update({
            where: { id },
            data: {
                feedbackPerception: data.perception,
                feedbackText: data.text,
                completed: true, // Marcar como concluído ao enviar feedback
                feedbackRead: false // Resetar para o treinador ver o alerta
            }
        });

        revalidatePath("/dashboard/planilhas");
        revalidatePath("/dashboard/treinos");
        revalidatePath(`/dashboard/planilhas/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Error saving feedback:", error);
        return { success: false, error: "Falha ao salvar feedback" };
    }
}

export async function saveWorkoutTemplateAction(data: {
    name: string;
    type: string;
    description: string;
    prescribedIntensity: string;
    category?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const template = await (prisma as any).workoutTemplate.create({
            data: {
                coachId: session.user.id,
                name: data.name,
                type: data.type,
                description: data.description,
                prescribedIntensity: data.prescribedIntensity,
                category: data.category || "GENERAL"
            }
        });

        revalidatePath("/dashboard/planilhas/nova");
        return { success: true, template };
    } catch (error) {
        console.error("Error saving template:", error);
        return { success: false, error: "Falha ao salvar modelo" };
    }
}

export async function getWorkoutTemplatesAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        return await (prisma as any).workoutTemplate.findMany({
            where: { coachId: session.user.id },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
    }
}

export async function deleteWorkoutTemplateAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        await (prisma as any).workoutTemplate.delete({
            where: { id, coachId: session.user.id }
        });

        revalidatePath("/dashboard/planilhas/nova");
        return { success: true };
    } catch (error) {
        console.error("Error deleting template:", error);
        return { success: false };
    }
}

export async function updateWorkoutTemplateAction(id: string, data: {
    name: string;
    type: string;
    description: string;
    prescribedIntensity: string;
    category?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const template = await (prisma as any).workoutTemplate.update({
            where: { id, coachId: session.user.id },
            data: {
                name: data.name,
                type: data.type,
                description: data.description,
                prescribedIntensity: data.prescribedIntensity,
                category: data.category || "GENERAL"
            }
        });

        revalidatePath("/dashboard/planilhas/nova");
        return { success: true, template };
    } catch (error) {
        console.error("Error updating template:", error);
        return { success: false, error: "Falha ao atualizar modelo" };
    }
}
export async function checkAthletesWorkoutsAction(date: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const targetDate = new Date(date + 'T12:00:00');
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const workouts = await prisma.workouts.findMany({
            where: {
                athlete: { coachId: session.user.id },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            select: { athleteProfileId: true }
        });

        const distinctIds = Array.from(new Set(workouts.map((w: any) => w.athleteProfileId)));
        return { success: true, prescribedIds: distinctIds };
    } catch (error) {
        console.error("Error checking workouts:", error);
        return { success: false, prescribedIds: [] };
    }
}

export async function markFeedbackAsReadAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        await prisma.workouts.update({
            where: { id },
            data: { feedbackRead: true }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        console.error("Error marking feedback as read:", error);
        return { success: false };
    }
}
