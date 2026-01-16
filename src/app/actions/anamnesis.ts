"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveAnamneseAction(data: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const { id, athleteProfileId, ...anamneseData } = data;
        const db = prisma as any;

        if (id) {
            await db.anamnesis.update({
                where: { id },
                data: {
                    ...anamneseData,
                    date: anamneseData.date ? new Date(anamneseData.date) : undefined
                }
            });
        } else {
            await db.anamnesis.create({
                data: {
                    ...anamneseData,
                    athleteProfileId,
                    date: anamneseData.date ? new Date(anamneseData.date) : new Date()
                }
            });
        }

        revalidatePath(`/dashboard/alunos/${athleteProfileId}/anamnese`);
        return { success: true };
    } catch (error: any) {
        console.error("Error saving anamnese:", error);
        return { success: false, error: error.message };
    }
}

export async function getAnamneseHistoryAction(athleteProfileId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const db = prisma as any;
        const history = await db.anamnesis.findMany({
            where: { athleteProfileId },
            orderBy: { date: 'desc' }
        });

        return history.map((h: any) => ({
            ...h,
            date: h.date.toISOString().split('T')[0]
        }));
    } catch (error) {
        console.error("Error fetching anamnese history:", error);
        return [];
    }
}

export async function deleteAnamneseAction(id: string, athleteProfileId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const db = prisma as any;
        await db.anamnesis.delete({
            where: { id }
        });

        revalidatePath(`/dashboard/alunos/${athleteProfileId}/anamnese`);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting anamnese:", error);
        return { success: false, error: error.message };
    }
}
