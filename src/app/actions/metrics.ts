"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function saveFitnessMetric(data: {
    athleteProfileId: string;
    category?: string;
    testType: string;
    exercise?: string;
    rawResult: number;
    calculatedVo2?: number;
    calculatedVmax?: number;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const metric = await prisma.fitnessMetrics.create({
            data: {
                id: `metric_${Date.now()}`,
                athleteProfileId: data.athleteProfileId,
                category: data.category || "AEROBIC",
                testType: data.testType,
                exercise: data.exercise,
                rawResult: data.rawResult,
                calculatedVo2: data.calculatedVo2 ?? null,
                calculatedVmax: data.calculatedVmax ?? null,
            }
        });

        return { success: true, metric };
    } catch (error: any) {
        console.error("[saveFitnessMetric] Detailed Error:", {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        return {
            success: false,
            error: `Erro técnico no banco de dados (${error.code || 'unknown'}). Contate o suporte.`
        };
    }
}

export async function saveAthleteResultAction(data: {
    date: string;
    distance: number; // metros
    timeSeconds: number; // segundos
    name?: string;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ATHLETE") {
            throw new Error("Unauthorized");
        }

        // Buscar o athleteProfileId para o usuário logado
        const athlete = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!athlete) {
            throw new Error("Perfil de atleta não encontrado.");
        }

        // Cálculos baseados no resultado da prova
        // Velocidade média em km/h = (Distancia em km) / (Tempo em horas)
        const distanceKm = data.distance / 1000;
        const timeHours = data.timeSeconds / 3600;
        const speedKmh = distanceKm / timeHours;

        // Usamos as mesmas fórmulas de conversão do sistema
        // VO2 = Vmax * 3.57
        const calculatedVo2 = speedKmh * 3.57;

        const metric = await prisma.fitnessMetrics.create({
            data: {
                id: `race_${Date.now()}`,
                athleteProfileId: athlete.id,
                category: "RACE",
                testType: "RACE",
                exercise: data.name || `${data.distance}m`,
                rawResult: data.timeSeconds, // Guardamos o tempo em segundos no rawResult
                calculatedVo2: calculatedVo2,
                calculatedVmax: speedKmh,
                date: new Date(data.date + 'T12:00:00'), // Normalização midday
            }
        });

        return { success: true, metric };
    } catch (error: any) {
        console.error("Error saving athlete result:", error);
        return { success: false, error: error.message || "Falha ao salvar o resultado." };
    }
}

export async function saveStrengthPRAction(data: {
    date: string;
    exercise: string;
    weight: number;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "ATHLETE") {
            throw new Error("Unauthorized");
        }

        const athlete = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!athlete) {
            throw new Error("Perfil de atleta não encontrado.");
        }

        const metric = await prisma.fitnessMetrics.create({
            data: {
                id: `strength_${Date.now()}`,
                athleteProfileId: athlete.id,
                category: "STRENGTH",
                testType: "PR",
                exercise: data.exercise,
                rawResult: data.weight,
                date: new Date(data.date + 'T12:00:00'), // Normalização midday
            }
        });

        return { success: true, metric };
    } catch (error: any) {
        console.error("Error saving strength PR:", error);
        return { success: false, error: error.message || "Falha ao salvar o recorde." };
    }
}
