"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
            },
        });

        if (!athleteProfile) return { success: false, error: "Athlete Profile not found" };

        // If no nutrition goal exists, create a default one
        let goal = athleteProfile.nutritionGoal;
        if (!goal) {
            goal = await prisma.nutritionGoal.create({
                data: {
                    athleteProfileId: athleteProfile.id,
                },
            });
        }

        const totalWater = athleteProfile.waterLogs.reduce((acc, log) => acc + log.amount, 0);
        const totalCalories = athleteProfile.mealLogs.reduce((acc, log) => acc + (log.calories || 0), 0);
        const totalProteins = athleteProfile.mealLogs.reduce((acc, log) => acc + (log.proteins || 0), 0);
        const totalCarbs = athleteProfile.mealLogs.reduce((acc, log) => acc + (log.carbs || 0), 0);
        const totalFats = athleteProfile.mealLogs.reduce((acc, log) => acc + (log.fats || 0), 0);

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
                },
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

        await prisma.waterLog.create({
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

        await prisma.mealLog.create({
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
