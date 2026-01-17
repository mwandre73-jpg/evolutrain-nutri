"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getExercisesAction() {
    try {
        const exercises = await prisma.exercise.findMany({
            orderBy: { name: 'asc' }
        });
        return exercises;
    } catch (error) {
        console.error("Error fetching exercises:", error);
        return [];
    }
}

export async function saveExerciseAction(data: {
    id?: string;
    name: string;
    muscles?: string;
    videoUrl?: string;
}) {
    try {
        if (data.id) {
            await prisma.exercise.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    muscles: data.muscles,
                    videoUrl: data.videoUrl
                }
            });
        } else {
            await prisma.exercise.create({
                data: {
                    name: data.name,
                    muscles: data.muscles,
                    videoUrl: data.videoUrl
                }
            });
        }
        revalidatePath("/dashboard/nutri/exercicios");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving exercise:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteExerciseAction(id: string) {
    try {
        await prisma.exercise.delete({
            where: { id }
        });
        revalidatePath("/dashboard/nutri/exercicios");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting exercise:", error);
        return { success: false, error: error.message };
    }
}
