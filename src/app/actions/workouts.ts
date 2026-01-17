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
    exercises?: {
        exerciseId: string;
        sets: number;
        reps: number;
        weight: number;
        rest?: string;
        notes?: string;
    }[];
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const workoutsCreated = [];
        const baseDate = new Date(data.date + 'T12:00:00');
        const repeatCount = data.repeatWeeks || 1;

        for (const athleteId of data.athleteProfileIds) {
            // Fetch athlete metrics for individualization
            const athlete = await prisma.athleteProfile.findUnique({
                where: { id: athleteId },
                include: { metrics: { orderBy: { date: 'desc' } } }
            });

            let individualizedDescription = data.description;
            let individualizedIntensity = data.prescribedIntensity;

            if (athlete && athlete.metrics && data.type === 'Corrida') {
                const aerobicMetric = athlete.metrics.find((m: any) => m.category === 'AEROBIC');
                const speedMetrics = athlete.metrics.filter((m: any) => m.category === 'SPEED');

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

                    if (pctValue && pctValue.includes('-')) {
                        const [minPct, maxPct] = pctValue.split('-').map(Number);
                        const speedMin = (vmax * (minPct / 100));
                        const speedMax = (vmax * (maxPct / 100));
                        const paceMin = speedMin > 0 ? kmhParaPace(speedMin) : "0:00";
                        const paceMax = speedMax > 0 ? kmhParaPace(speedMax) : "0:00";
                        return `${paceMax} a ${paceMin}`;
                    }

                    const pct = pctValue ? Number(pctValue) : 100;
                    const speed = (vmax * (pct / 100));
                    const paceSecs = speed > 0 ? 3600 / speed : 0;
                    const totalSeconds = (paceSecs * d) / 1000;
                    const m = Math.floor(totalSeconds / 60);
                    const s = Math.round(totalSeconds % 60);
                    if (m === 0) return `${s}s`;
                    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
                });

                let globalVmax = aerobicMetric?.calculatedVmax || 0;
                if (data.classification === 'Speed') {
                    const speedMetric = speedMetrics[0];
                    if (speedMetric) globalVmax = (speedMetric as any).calculatedVmax || 0;
                }
                const globalPct = data.customPercent || 100;
                const globalSpeed = (globalVmax * (globalPct / 100));
                const globalPaceStr = kmhParaPace(globalSpeed);

                if (individualizedIntensity.includes('[PACE]')) {
                    individualizedIntensity = individualizedIntensity.replace('[PACE]', globalPaceStr);
                } else if (data.athleteProfileIds.length > 1 && (individualizedIntensity === "Vários atletas selecionados" || !individualizedIntensity)) {
                    individualizedIntensity = `Ritmo ${globalPaceStr} min/km (${data.classification || 'CRM'})`;
                }
            }

            if (athlete && athlete.metrics && data.type === 'Musculação') {
                individualizedDescription = individualizedDescription.replace(/\{C:(\d+)(?::([^:}]+))?\}/g, (match, percent, exerciseHint) => {
                    const p = parseInt(percent);
                    let loadRef = 0;
                    if (exerciseHint) {
                        const specificMetric = athlete.metrics.find((m: any) =>
                            m.category === 'STRENGTH' &&
                            m.exercise?.toLowerCase().includes(exerciseHint.toLowerCase())
                        );
                        if (specificMetric) loadRef = (specificMetric as any).rawResult || 0;
                    }
                    if (!loadRef) {
                        const isSuperiores = individualizedIntensity.toLowerCase().includes('superior') ||
                            (exerciseHint && ['supino', 'ombro', 'triceps', 'peito', 'costas'].some((h: any) => exerciseHint.toLowerCase().includes(h)));
                        const refType = isSuperiores ? 'supino' : 'agachamento';
                        const refMetric = athlete.metrics.find((m: any) => m.exercise?.toLowerCase().includes(refType));
                        if (refMetric) loadRef = (refMetric as any).rawResult || 0;
                    }
                    if (loadRef > 0) {
                        const load = (loadRef * (p / 100)).toFixed(1);
                        return `${load}kg (${p}%)`;
                    }
                    return `${p}%`;
                });
            }

            for (let i = 0; i < repeatCount; i++) {
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

                if (data.exercises && data.exercises.length > 0) {
                    for (const ex of data.exercises) {
                        await (prisma as any).workoutExercise.create({
                            data: {
                                workoutId: workout.id,
                                exerciseId: ex.exerciseId,
                                sets: ex.sets,
                                reps: ex.reps,
                                weight: ex.weight,
                                rest: ex.rest,
                                notes: ex.notes
                            }
                        });
                    }
                }
                workoutsCreated.push(workout);
            }
        }

        revalidatePath("/dashboard/planilhas");
        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard");

        return { success: true, count: workoutsCreated.length };
    } catch (error) {
        console.error("Error saving workout:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function updateWorkoutAction(id: string, data: {
    date: string;
    type: string;
    description: string;
    prescribedIntensity: string;
    exercises?: {
        exerciseId: string;
        sets: number;
        reps: number;
        weight: number;
        rest?: string;
        notes?: string;
    }[];
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const workout = await prisma.workouts.update({
            where: { id },
            data: {
                date: new Date(data.date + 'T12:00:00'),
                type: data.type,
                description: data.description,
                prescribedIntensity: data.prescribedIntensity
            }
        });

        // Update exercises if provided
        if (data.exercises) {
            // Delete old exercises first (simple approach)
            await (prisma as any).workoutExercise.deleteMany({
                where: { workoutId: id }
            });

            for (const ex of data.exercises) {
                await (prisma as any).workoutExercise.create({
                    data: {
                        workoutId: id,
                        exerciseId: ex.exerciseId,
                        sets: ex.sets,
                        reps: ex.reps,
                        weight: ex.weight,
                        rest: ex.rest,
                        notes: ex.notes
                    }
                });
            }
        }

        revalidatePath(`/dashboard/planilhas/${id}`);
        revalidatePath("/dashboard/planilhas");
        return { success: true };
    } catch (error) {
        console.error("Error updating workout:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function getCoachSelfWorkoutsAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            return [];
        }

        const athleteProfile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!athleteProfile) return [];

        const workouts = await prisma.workouts.findMany({
            where: {
                athleteProfileId: athleteProfile.id,
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            },
            orderBy: { date: 'asc' },
            take: 4
        });

        return workouts.map((w: any) => ({
            ...w,
            date: w.date.toLocaleDateString('pt-BR'),
            intensity: w.prescribedIntensity
        }));
    } catch (error) {
        console.error("Error fetching coach self workouts:", error);
        return [];
    }
}

export async function getWorkoutsAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const where = session.user.role === "COACH"
            ? { athlete: { coachId: session.user.id } }
            : { athleteProfileId: session.user.id };

        const workouts = await prisma.workouts.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                athlete: {
                    include: { user: true }
                }
            }
        });

        return workouts.map((w: any) => ({
            ...w,
            athleteName: w.athlete.user?.name || "Atleta",
            date: w.date.toLocaleDateString('pt-BR')
        }));
    } catch (error) {
        console.error("Error fetching workouts:", error);
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
                    include: { user: true }
                },
                exercises: {
                    include: {
                        exercise: true,
                        executions: true
                    }
                }
            }
        });

        if (!workout) return null;

        return {
            ...workout,
            athleteName: workout.athlete.user?.name || "Atleta",
            date: workout.date.toISOString().split('T')[0]
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

        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard/planilhas");
        return { success: true };
    } catch (error) {
        console.error("Error marking workout as completed:", error);
        return { success: false };
    }
}

export async function deleteWorkoutAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        await prisma.workouts.delete({ where: { id } });

        revalidatePath("/dashboard/planilhas");
        return { success: true };
    } catch (error) {
        console.error("Error deleting workout:", error);
        return { success: false };
    }
}

export async function saveWorkoutFeedbackAction(id: string, data: { perception: number; text: string }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        await prisma.workouts.update({
            where: { id },
            data: {
                feedbackPerception: data.perception,
                feedbackText: data.text,
                completed: true
            }
        });

        revalidatePath("/dashboard/treinos");
        revalidatePath("/dashboard/planilhas");
        return { success: true };
    } catch (error) {
        console.error("Error saving workout feedback:", error);
        return { success: false };
    }
}

export async function getWorkoutTemplatesAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");
        return await prisma.workoutTemplate.findMany({
            where: { coachId: session.user.id },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
    }
}

export async function saveWorkoutTemplateAction(data: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        await prisma.workoutTemplate.create({
            data: {
                ...data,
                id: `template_${Date.now()}`,
                coachId: session.user.id
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error saving template:", error);
        return { success: false };
    }
}

export async function updateWorkoutTemplateAction(id: string, data: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        await prisma.workoutTemplate.update({
            where: { id },
            data
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating template:", error);
        return { success: false };
    }
}

export async function checkAthletesWorkoutsAction(date: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const targetDate = new Date(date + 'T12:00:00');
        const workouts = await prisma.workouts.findMany({
            where: {
                date: targetDate,
                athlete: { coachId: session.user.id }
            },
            select: { athleteProfileId: true }
        });

        return {
            success: true,
            prescribedIds: workouts.map((w: any) => w.athleteProfileId)
        };
    } catch (error) {
        console.error("Error checking workouts:", error);
        return { success: false, prescribedIds: [] };
    }
}

export async function getCoachDashboardStatsAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") throw new Error("Unauthorized");

        const totalAthletes = await prisma.athleteProfile.count({
            where: { coachId: session.user.id }
        });

        const unreadFeedbackCount = await prisma.workouts.count({
            where: {
                athlete: { coachId: session.user.id },
                completed: true,
                feedbackRead: false
            }
        });

        return {
            totalAthletes,
            unreadFeedbackCount
        };
    } catch (error) {
        console.error("Error fetching coach dashboard stats:", error);
        return { totalAthletes: 0, unreadFeedbackCount: 0 };
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

export async function saveSetExecutionAction(data: {
    workoutExerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const existing = await (prisma as any).workoutExerciseExecution.findFirst({
            where: {
                workoutExerciseId: data.workoutExerciseId,
                setNumber: data.setNumber
            }
        });

        if (existing) {
            await (prisma as any).workoutExerciseExecution.update({
                where: { id: existing.id },
                data: {
                    weight: data.weight,
                    reps: data.reps,
                    completed: true
                }
            });
        } else {
            await (prisma as any).workoutExerciseExecution.create({
                data: {
                    workoutExerciseId: data.workoutExerciseId,
                    setNumber: data.setNumber,
                    weight: data.weight,
                    reps: data.reps,
                    completed: true
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error saving set execution:", error);
        return { success: false };
    }
}
