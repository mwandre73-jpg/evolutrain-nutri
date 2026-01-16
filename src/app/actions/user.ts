"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

export async function updateProfileAction(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const name = formData.get("name") as string;
        const imageFile = formData.get("image") as File | null;

        let imagePath = undefined;

        if (imageFile && imageFile.size > 0 && typeof imageFile !== 'string') {
            const bytes = await imageFile.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Resize image to 400x400 and convert to webp for performance
            const resizedBuffer = await sharp(buffer)
                .resize(400, 400, {
                    fit: "cover",
                    position: "center"
                })
                .webp({ quality: 80 })
                .toBuffer();

            // Create a unique filename with .webp extension
            const filename = `${session.user.id}_${Date.now()}.webp`;
            const path = join(process.cwd(), "public", "uploads", "profiles", filename);

            await writeFile(path, resizedBuffer);
            imagePath = `/uploads/profiles/${filename}`;
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name || undefined,
                image: imagePath,
            },
        });

        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return { success: false, error: error.message || "Erro ao atualizar perfil" };
    }
}

export async function updatePasswordAction(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;

        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id }
        });

        if (!user) throw new Error("User not found");

        const bcrypt = require('bcryptjs');

        // Verifica senha atual (aceita texto puro se for legado)
        const isValid = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
        const isLegacyMatch = user.password === currentPassword;

        if (!isValid && !isLegacyMatch) {
            throw new Error("Senha atual incorreta");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: (session.user as any).id },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating password:", error);
        return { success: false, error: error.message || "Erro ao atualizar senha" };
    }
}

export async function getAllCoachesAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.email !== 'treinador@evolutrain.com') {
            throw new Error("Unauthorized");
        }

        const coaches = await prisma.user.findMany({
            where: { role: 'COACH' },
            select: {
                id: true,
                name: true,
                email: true,
                image: true
            }
        });

        return coaches;
    } catch (error) {
        console.error("Error fetching coaches:", error);
        return [];
    }
}

export async function createCoachAction(name: string, email: string) {
    try {
        const session = await getServerSession(authOptions);

        // Proteção estrita: apenas o Marcio pode criar outros treinadores
        if (!session || session.user.email !== 'treinador@evolutrain.com') {
            throw new Error("Unauthorized");
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            throw new Error("Este e-mail já está cadastrado.");
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('123456', 10);
        const coachId = `coach_${Date.now()}`;

        await prisma.user.create({
            data: {
                id: coachId,
                name,
                email: normalizedEmail,
                role: 'COACH',
                password: hashedPassword
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating coach:", error);
        return { success: false, error: error.message || "Erro ao criar treinador" };
    }
}

export async function deleteCoachAction(coachId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.email !== 'treinador@evolutrain.com') {
            throw new Error("Unauthorized");
        }

        const adminUser = await prisma.user.findUnique({
            where: { email: 'treinador@evolutrain.com' }
        });

        if (adminUser?.id === coachId) {
            throw new Error("Você não pode excluir o administrador principal.");
        }

        // Cleanup related data manually where Cascade is not on coachId
        await prisma.invitation.deleteMany({ where: { coachId } });
        await prisma.workoutTemplate.deleteMany({ where: { coachId } });

        const athletes = await prisma.athleteProfile.findMany({
            where: { coachId },
            select: { userId: true, id: true }
        });

        for (const athlete of athletes) {
            if (athlete.userId) {
                await prisma.user.delete({ where: { id: athlete.userId } });
            } else {
                await prisma.athleteProfile.delete({ where: { id: athlete.id } });
            }
        }

        await prisma.user.delete({ where: { id: coachId } });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting coach:", error);
        return { success: false, error: error.message || "Erro ao excluir treinador" };
    }
}
