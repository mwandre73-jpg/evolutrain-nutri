"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";
import { revalidatePath } from "next/cache";

export async function getAthleteNutritionAction() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const athleteProfile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id },
            include: {
                nutritionGoal: true,
                waterLogs: {
                    where: {
                        date: {
                            gte: startOfDay(new Date()),
                            lte: endOfDay(new Date()),
                        },
                    },
                },
                mealLogs: {
                    where: {
                        date: {
                            gte: startOfDay(new Date()),
                            lte: endOfDay(new Date()),
                        },
                    },
                },
                metrics: {
                    where: {
                        date: {
                            gte: startOfDay(new Date()),
                            lte: endOfDay(new Date()),
                        },
                        caloriesBurned: { not: null }
                    }
                }
            } as any,
        });

        if (!athleteProfile) return { success: false, error: "Athlete Profile not found" };

        // If no nutrition goal exists, create a default one
        let goal = athleteProfile.nutritionGoal;
        if (!goal) {
            goal = await (prisma as any).nutritionGoal.create({
                data: {
                    athleteProfileId: athleteProfile.id,
                },
            });
        }

        const totalWater = (athleteProfile as any).waterLogs.reduce((acc: number, log: any) => acc + log.amount, 0);
        const totalCalories = (athleteProfile as any).mealLogs.reduce((acc: number, log: any) => acc + (log.calories || 0), 0);
        const totalProteins = (athleteProfile as any).mealLogs.reduce((acc: number, log: any) => acc + (log.proteins || 0), 0);
        const totalCarbs = (athleteProfile as any).mealLogs.reduce((acc: number, log: any) => acc + (log.carbs || 0), 0);
        const totalFats = (athleteProfile as any).mealLogs.reduce((acc: number, log: any) => acc + (log.fats || 0), 0);
        const totalWorkoutCalories = (athleteProfile as any).metrics.reduce((acc: number, m: any) => acc + (m.caloriesBurned || 0), 0);

        return {
            success: true,
            data: {
                goal,
                current: {
                    calories: totalCalories,
                    proteins: totalProteins,
                    carbs: totalCarbs,
                    fats: totalFats,
                    water: totalWater,
                    workoutCalories: totalWorkoutCalories,
                },
                balance: totalCalories - totalWorkoutCalories,
                meals: athleteProfile.mealLogs,
            },
        };
    } catch (error) {
        console.error("Error fetching nutrition data:", error);
        return { success: false, error: "Internal Server Error" };
    }
}

export async function saveWaterLogAction(amount: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const athleteProfile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!athleteProfile) return { success: false, error: "Profile not found" };

        await (prisma as any).waterLog.create({
            data: {
                athleteProfileId: athleteProfile.id,
                amount,
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error saving water log" };
    }
}

export async function saveMealLogAction(data: {
    mealType: string;
    description?: string;
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
    photoUrl?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const athleteProfile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!athleteProfile) return { success: false, error: "Profile not found" };

        await (prisma as any).mealLog.create({
            data: {
                athleteProfileId: athleteProfile.id,
                ...data,
            },
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error saving meal log" };
    }
}

/**
 * IA Estimation Action (Placeholder for real AI integration)
 * In a production app, you would use OpenAI, Anthropic or Gemini here.
 */
export async function estimateMacrosAction(description: string) {
    // This is where you'd call your AI API
    // For now, we return a heuristic or structured response
    // Example logic using a mock-intelligence
    const query = description.toLowerCase();

    // Heuristic data (Sample)
    const database: any = {
        "frango": { cals: 165, p: 31, c: 0, f: 3.6 }, // per 100g
        "arroz": { cals: 130, p: 2.7, c: 28, f: 0.3 },
        "ovo": { cals: 155, p: 13, c: 1.1, f: 11 },
        "pão": { cals: 265, p: 9, c: 49, f: 3.2 },
    };

    let estimated = { calories: 0, proteins: 0, carbs: 0, fats: 0 };

    // Simple simulation of AI parsing
    if (query.includes("frango") && query.includes("arroz")) {
        estimated = { calories: 450, proteins: 35, carbs: 55, fats: 10 };
    } else if (query.includes("ovo") || query.includes("pão")) {
        estimated = { calories: 320, proteins: 15, carbs: 40, fats: 12 };
    } else {
        estimated = { calories: 200, proteins: 10, carbs: 20, fats: 5 };
    }

    return {
        success: true,
        data: estimated,
        isAIEstimate: true,
        message: "Estimativa baseada em IA (simulada). Ajuste se necessário."
    };
}
