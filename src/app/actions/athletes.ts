"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { kmhParaPace } from "@/lib/calculos";
import { headers } from "next/headers";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export async function getAllAthletesAction() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const coachId = (session.user as any).id;
        console.log(`[getAllAthletesAction] Fetching for coachId: ${coachId}`);

        let athletes: any[];

        // Buscamos os perfis base primeiro
        athletes = await prisma.athleteProfile.findMany({
            where: {
                coachId: session.user.id,
                OR: [
                    { userId: null },
                    { userId: { not: session.user.id } }
                ]
            },
            include: {
                user: { select: { name: true, email: true } },
                metrics: {
                    where: {
                        testType: { not: 'STRAVA_IMPORT' },
                        category: { not: 'RACE' }
                    },
                    orderBy: { date: 'desc' },
                    take: 1
                }
            } as any
        });

        // Complementamos com dados de convite manualmente para evitar erros de relação do Prisma out-of-sync
        for (const a of athletes) {
            if (!a.userId || !a.user?.name) {
                try {
                    const invs: any[] = await prisma.$queryRaw`
                        SELECT name, email FROM invitations 
                        WHERE athleteProfileId = ${a.id} 
                        ORDER BY createdAt DESC LIMIT 1
                    `;
                    a.invitationData = invs[0];
                } catch (e) {
                    a.invitationData = null;
                }
            }
        }

        const athleteList = athletes.map((a: any) => ({
            id: a.id,
            name: a.user?.name || a.invitationData?.name || "Sem Nome",
            vo2: a.metrics?.[0]?.calculatedVo2 || 0,
            lastMetric: (a.metrics && a.metrics[0]) ? {
                category: a.metrics[0].category,
                result: a.metrics[0].rawResult,
                testType: a.metrics[0].testType,
                exercise: a.metrics[0].exercise
            } : null,
            lastTest: a.metrics?.[0]?.date ? new Date(a.metrics[0].date).toLocaleDateString('pt-BR') : "--",
            status: a.userId ? "Ativo" : "Pendente"
        }));

        // Removemos inviteList daqui pois agora todos estão em athleteList 
        // ou mantemos para convites que não criaram perfil? 
        // No meu novo flow, todo convite cria perfil.
        return athleteList;
    } catch (error) {
        console.error("Error fetching all athletes:", error);
        return [];
    }
}

export async function getAthletes() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const athletes = await prisma.athleteProfile.findMany({
            where: {
                coachId: session.user.id
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return athletes.map((a: any) => ({
            id: a.id,
            name: a.user?.name || "Sem Nome"
        }));
    } catch (error) {
        console.error("[getAthletes] Critical error fetching athletes:", error);
        return [];
    }
}

export async function getMyAthleteProfileIdAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return null;

        const profile = await prisma.athleteProfile.findFirst({
            where: { userId: (session.user as any).id },
            select: { id: true }
        });

        return profile?.id || null;
    } catch (error) {
        console.error("Error fetching my athlete profile ID:", error);
        return null;
    }
}
export async function getAthleteAction(id: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const athlete = await prisma.athleteProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                metrics: {
                    orderBy: { date: 'desc' }
                }
            } as any
        });

        if (!athlete) {
            console.log(`[getAthleteAction] NO ATHLETE FOUND for id: "${id}"`);
            return null;
        }

        console.log(`[getAthleteAction] Found athlete: ${athlete.id}`);

        // Buscar gols via SQL (fallback para Prisma desatualizado)
        const rawGoals: any[] = await prisma.$queryRaw`
            SELECT weeklyRunningGoal, weeklyStrengthGoal FROM athleteprofile WHERE id = ${id} LIMIT 1
        `;
        if (rawGoals[0]) {
            (athlete as any).weeklyRunningGoal = rawGoals[0].weeklyRunningGoal;
            (athlete as any).weeklyStrengthGoal = rawGoals[0].weeklyStrengthGoal;
        }

        // Buscar gênero via SQL para garantir que não seja filtrado pelo Prisma desatualizado
        const rawProfile: any[] = await prisma.$queryRaw`
            SELECT gender FROM athleteprofile WHERE id = ${id} LIMIT 1
        `;

        if (rawProfile[0]) {
            (athlete as any).gender = rawProfile[0].gender;
        }

        // Se o usuário for nulo, buscamos o nome do convite
        let name = (athlete as any).user?.name || "Sem Nome";
        let email = (athlete as any).user?.email;

        if (!(athlete as any).userId) {
            const invs: any[] = await prisma.$queryRaw`
                SELECT name, email FROM invitations WHERE athleteProfileId = ${athlete.id} ORDER BY createdAt DESC LIMIT 1
            `;
            if (invs[0]) {
                name = invs[0].name;
                email = invs[0].email;
            }
        }

        return {
            id: athlete.id,
            name,
            email,
            peso: athlete.peso,
            altura: athlete.altura,
            idade: athlete.idade,
            weeklyRunningGoal: athlete.weeklyRunningGoal,
            weeklyStrengthGoal: athlete.weeklyStrengthGoal,
            gender: (athlete as any).gender,
            dataNascimento: (athlete as any).dataNascimento ? new Date((athlete as any).dataNascimento).toISOString().split('T')[0] : null,
            image: (athlete as any).user?.image,
            weeklyProgress: await calculateWeeklyProgress(athlete.id),
            metrics: ((athlete as any).metrics || []).map((m: any) => ({
                id: m.id,
                date: new Date(m.date).toLocaleDateString('pt-BR'),
                category: m.category,
                testType: m.testType,
                exercise: m.exercise,
                result: m.rawResult,
                vo2: m.calculatedVo2,
                vmax: m.calculatedVmax,
                rawResult: m.rawResult
            }))
        };
    } catch (error) {
        console.error("Error fetching athlete details:", error);
        return null;
    }
}

export async function updateAthleteProfileAction(data: {
    id: string;
    peso?: number;
    altura?: number;
    dataNascimento?: string;
    gender?: string;
    weeklyRunningGoal?: number;
    weeklyStrengthGoal?: number;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        let idade = undefined;
        if (data.dataNascimento) {
            const birthDate = new Date(data.dataNascimento);
            const today = new Date();
            idade = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                idade--;
            }
        }

        console.log(`[UpdateProfile] Updating athlete ${data.id}`, {
            peso: data.peso,
            altura: data.altura,
            gender: data.gender,
            birth: data.dataNascimento,
            run: data.weeklyRunningGoal,
            strength: data.weeklyStrengthGoal
        });

        console.log(`[UpdateProfile] Updating athlete ${data.id}`, data);

        const birthDateVal = data.dataNascimento ? new Date(data.dataNascimento + 'T12:00:00') : null;

        // Validar metas
        const runGoal = typeof data.weeklyRunningGoal === 'number' && !isNaN(data.weeklyRunningGoal) ? data.weeklyRunningGoal : 45;
        const strGoal = typeof data.weeklyStrengthGoal === 'number' && !isNaN(data.weeklyStrengthGoal) ? data.weeklyStrengthGoal : 3;

        await prisma.$executeRawUnsafe(`
            UPDATE athleteprofile 
            SET peso = ?, 
                altura = ?, 
                gender = ?, 
                dataNascimento = ?, 
                idade = ?,
                weeklyRunningGoal = ?,
                weeklyStrengthGoal = ?
            WHERE id = ?
        `,
            data.peso,
            data.altura,
            data.gender || null,
            birthDateVal,
            idade,
            runGoal,
            strGoal,
            data.id
        );

        revalidatePath("/dashboard");
        revalidatePath(`/dashboard/alunos/${data.id}`);

        console.log(`[UpdateProfile] Successfully updated athlete ${data.id} with goals ${runGoal}/${strGoal}`);

        const updated = { id: data.id }; // Simplified return as we don't strictly need the full object here

        return { success: true, athlete: updated };
    } catch (error: any) {
        console.error("Error updating athlete profile:", error);
        return { success: false, error: error.message || "Erro ao atualizar perfil" };
    }
}

export async function getStudentProfileAction(startDate?: string, endDate?: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error("Unauthorized");
        }

        console.log(`[ProfileService] Fetching profile for userId: ${session.user.id}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const athlete = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id },
            include: {
                metrics: { orderBy: { date: 'desc' }, where: { category: 'AEROBIC' }, take: 1 },
                integrations: { where: { type: 'STRAVA' }, take: 1 }
            }
        });

        if (!athlete) {
            console.warn(`[ProfileService] No AthleteProfile found for userId: ${session.user.id}`);
            return null;
        }

        // Buscar gols via SQL (fallback para Prisma desatualizado)
        const rawGoals: any[] = await prisma.$queryRaw`
            SELECT weeklyRunningGoal, weeklyStrengthGoal FROM athleteprofile WHERE id = ${athlete.id} LIMIT 1
        `;
        if (rawGoals[0]) {
            (athlete as any).weeklyRunningGoal = rawGoals[0].weeklyRunningGoal;
            (athlete as any).weeklyStrengthGoal = rawGoals[0].weeklyStrengthGoal;
        }

        console.log(`[ProfileService] Found AthleteProfile: ${athlete.id} with goals:`, {
            run: (athlete as any).weeklyRunningGoal,
            str: (athlete as any).weeklyStrengthGoal
        });

        const latestAerobic = athlete.metrics[0];

        const weeklyProgress = await calculateWeeklyProgress(athlete.id, startDate, endDate);

        // 1. Prioridade: Treino de HOJE (qualquer status)

        // 1. Prioridade: Treino de HOJE (qualquer status)
        let todayWorkout = await prisma.workouts.findFirst({
            where: {
                athleteProfileId: athlete.id,
                date: { gte: today, lt: tomorrow }
            }
        });

        // 2. Segunda prioridade: O treino mais recente que NÃO foi concluído
        if (!todayWorkout) {
            todayWorkout = await prisma.workouts.findFirst({
                where: {
                    athleteProfileId: athlete.id,
                    completed: false,
                    date: { lt: today }
                },
                orderBy: { date: 'desc' }
            });
        }

        // 3. Terceira prioridade: O PRÓXIMO treino agendado
        if (!todayWorkout) {
            todayWorkout = await prisma.workouts.findFirst({
                where: {
                    athleteProfileId: athlete.id,
                    date: { gte: tomorrow }
                },
                orderBy: { date: 'asc' }
            });
        }

        // 4. Buscar resultados de provas e força (RACE / STRENGTH)
        const recentRaces = await prisma.fitnessMetrics.findMany({
            where: {
                athleteProfileId: athlete.id,
                category: { in: ["RACE", "STRENGTH"] }
            },
            orderBy: { date: 'desc' },
            take: 5
        });

        return {
            id: athlete.id,
            vo2: latestAerobic?.calculatedVo2 || 0,
            vmax: latestAerobic?.calculatedVmax || 0,
            lastTestDate: latestAerobic?.date ? new Date(latestAerobic.date).toLocaleDateString('pt-BR') : "--",
            stravaConnected: athlete.integrations.length > 0,
            todayWorkout: todayWorkout ? {
                id: todayWorkout.id,
                type: todayWorkout.type,
                date: todayWorkout.date.toLocaleDateString('pt-BR'),
                description: todayWorkout.description,
                prescribedIntensity: todayWorkout.prescribedIntensity,
                completed: todayWorkout.completed,
                isPast: todayWorkout.date < today,
                isFuture: todayWorkout.date >= tomorrow
            } : null,
            recentRaces: recentRaces.map((r: any) => ({
                id: r.id,
                name: r.exercise,
                exercise: r.exercise,
                category: r.category,
                date: r.date.toLocaleDateString('pt-BR'),
                weight: r.rawResult,
                distance: r.calculatedVmax ? (r.rawResult * (r.calculatedVmax / 3.6)) / 1000 : 0,
                time: r.category === 'STRENGTH' ? null : `${Math.floor(r.rawResult / 3600)}h ${Math.floor((r.rawResult % 3600) / 60)}m ${r.rawResult % 60}s`.replace(/^0h /, ''),
                pace: r.calculatedVmax ? kmhParaPace(r.calculatedVmax || 0) : null
            })),
            weeklyProgress
        };
    } catch (error) {
        console.error("Error fetching student profile:", error);
        return null;
    }
}

export async function getStudentWorkoutsAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const athlete = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!athlete) return [];

        const workouts = await prisma.workouts.findMany({
            where: { athleteProfileId: athlete.id },
            orderBy: { date: 'asc' }
        });

        return workouts.map((w: any) => ({
            id: w.id,
            date: w.date.toLocaleDateString('pt-BR'),
            type: w.type,
            description: w.description,
            prescribedIntensity: w.prescribedIntensity,
            completed: w.completed
        }));
    } catch (error) {
        console.error("Error fetching student workouts:", error);
        return [];
    }
}
export async function getAthleteEvolutionAction() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) throw new Error("Unauthorized");

        const athlete = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id },
            include: {
                metrics: {
                    orderBy: { date: 'asc' }
                }
            }
        });

        if (!athlete) return { vo2History: [], weightHistory: [] };

        const vo2History = athlete.metrics
            .filter((m: any) => m.category === 'AEROBIC' && m.calculatedVo2)
            .map((m: any) => ({
                date: new Date(m.date).toLocaleDateString('pt-BR'),
                vo2: m.calculatedVo2,
                vmax: m.calculatedVmax,
                testType: m.testType
            }));

        const weightHistory = athlete.metrics
            .filter((m: any) => m.category === 'WEIGHT' || (m.category === 'AEROBIC' && m.rawResult)) // Logic for weight might vary
            .map((m: any) => ({
                date: new Date(m.date).toLocaleDateString('pt-BR'),
                value: m.rawResult
            }));

        // Se quisermos algo mais específico para "Tempos em Provas", podemos filtrar as métricas de corrida
        const raceTimes = athlete.metrics
            .filter((m: any) => m.testType === 'Corrida' || m.testType === 'Cooper' || m.category === 'RACE' || m.category === 'STRENGTH')
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ordem decrescente
            .map((m: any) => {
                const distanceVal = (m.calculatedVmax && m.rawResult)
                    ? (m.calculatedVmax * m.rawResult) / 3600
                    : null;

                return {
                    id: m.id,
                    date: new Date(m.date).toLocaleDateString('pt-BR'),
                    testType: m.category === 'STRENGTH' ? 'PR Musculação' : (m.testType === 'RACE' ? 'Prova' : m.testType),
                    category: m.category,
                    result: m.rawResult,
                    exercise: m.exercise,
                    vmax: m.calculatedVmax,
                    distance: distanceVal
                };
            });

        return {
            vo2History,
            weightHistory,
            raceTimes
        };
    } catch (error) {
        console.error("Error fetching athlete evolution:", error);
        return { vo2History: [], weightHistory: [], raceTimes: [] };
    }
}

export async function getCoachDashboardStatsAction() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const coachId = session.user.id;
        console.log(`[DashboardStats] coachId: ${coachId}`);
        console.log(`[DashboardStats] Fetching for coachId: ${coachId}`);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let totalAthletes = 0;
        let totalWorkoutsToday = 0;
        let feedbackAlerts = 0;
        let feedbackWorkouts: any[] = [];
        let recentActivities: any[] = [];

        // Fetch each stat individually to prevent one failure from breaking everything
        try {
            totalAthletes = await prisma.athleteProfile.count({
                where: {
                    coachId,
                    OR: [
                        { userId: null },
                        { userId: { not: coachId } }
                    ]
                }
            });
        } catch (e) { console.error("[DashboardStats] Error counting athletes:", e); }

        try {
            totalWorkoutsToday = await prisma.workouts.count({
                where: {
                    athlete: {
                        coachId,
                        OR: [
                            { userId: null },
                            { userId: { not: coachId } }
                        ]
                    },
                    date: { gte: todayStart, lt: todayEnd }
                }
            });
        } catch (e) { console.error("[DashboardStats] Error counting workouts:", e); }

        try {
            feedbackAlerts = await prisma.workouts.count({
                where: {
                    athlete: {
                        coachId,
                        OR: [
                            { userId: null },
                            { userId: { not: coachId } }
                        ]
                    },
                    feedbackText: { not: null },
                    feedbackRead: false
                } as any
            });
        } catch (e) { console.error("[DashboardStats] Error counting feedback alerts:", e); }

        try {
            const fbWorkouts = await prisma.workouts.findMany({
                where: {
                    athlete: {
                        coachId,
                        OR: [
                            { userId: null },
                            { userId: { not: coachId } }
                        ]
                    },
                    feedbackText: { not: null },
                    feedbackRead: false
                } as any,
                include: {
                    athlete: { include: { user: { select: { name: true } } } }
                },
                orderBy: { date: 'desc' },
                take: 10
            });
            feedbackWorkouts = fbWorkouts.map((w: any) => ({
                id: w.id,
                athleteName: (w.athlete as any)?.user?.name || "Atleta",
                date: w.date.toLocaleDateString('pt-BR'),
                type: w.type,
                feedbackText: w.feedbackText
            }));
        } catch (e) { console.error("[DashboardStats] Error fetching feedback workouts:", e); }

        try {
            const studentActivities = await prisma.fitnessMetrics.findMany({
                where: {
                    athlete: {
                        coachId,
                        OR: [
                            { userId: null },
                            { userId: { not: coachId } }
                        ]
                    }
                },
                include: {
                    athlete: { include: { user: { select: { name: true } } } }
                },
                orderBy: { date: 'desc' },
                take: 10
            });
            recentActivities = studentActivities.map((a: any) => ({
                id: a.id,
                athleteName: a.athlete.user?.name || "Atleta",
                exercise: a.exercise,
                result: a.rawResult,
                vmax: a.calculatedVmax,
                date: a.date
            }));
        } catch (e) { console.error("[DashboardStats] Error fetching recent activities:", e); }

        return {
            totalAthletes,
            totalWorkoutsToday,
            pendingTests: 0,
            feedbackAlerts,
            feedbackWorkouts,
            recentActivities
        };
    } catch (error) {
        console.error("[getCoachDashboardStatsAction] Critical error:", error);
        return {
            totalAthletes: 0,
            totalWorkoutsToday: 0,
            pendingTests: 0,
            feedbackAlerts: 0,
            feedbackWorkouts: [],
            recentActivities: []
        };
    }
}

export async function createInviteAction(name: string, email?: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const coachId = session.user.id;

        // Limite de 10 atletas para a fase de validação
        const count = await prisma.athleteProfile.count({
            where: {
                coachId,
                OR: [
                    { userId: null },
                    { userId: { not: coachId } }
                ]
            }
        });

        if (count >= 10) {
            return { success: false, error: "Limite de 10 atletas atingido para esta fase de validação." };
        }

        const token = randomBytes(32).toString('hex');

        // NOVO: Se um e-mail foi fornecido, garantir que o Usuário exista no banco para permitir o login
        if (email) {
            try {
                const existingUsers: any[] = await prisma.$queryRaw`
                    SELECT id FROM user WHERE email = ${email} LIMIT 1
                `;

                if (existingUsers.length === 0) {
                    console.log(`Creating placeholder user for invite: ${email}`);
                    const newUserId = `user_${Date.now()}`;
                    const bcrypt = require('bcryptjs');
                    const hashedPassword = await bcrypt.hash('123456', 10);

                    await prisma.$executeRaw`
                        INSERT INTO user (id, name, email, role, password) 
                        VALUES (${newUserId}, ${name}, ${email}, 'ATHLETE', ${hashedPassword})
                    `;
                }
            } catch (userError: any) {
                console.error("Error creating placeholder user:", userError);
                // Não travamos o processo se falhar aqui, pois o convite ainda é útil
            }
        }

        // 1. Criar perfil de atleta vazio (pré-cadastro) via SQL puro para evitar erros de relação do Prisma Client
        const profileId = `athlete_${Date.now()}`;
        try {
            await prisma.$executeRaw`
                INSERT INTO athleteprofile (id, coachId, userId) 
                VALUES (${profileId}, ${session.user.id}, NULL)
            `;
        } catch (dbError: any) {
            console.error("Error creating athlete profile via SQL:", dbError);
            throw new Error("Falha ao criar perfil base do atleta: " + dbError.message);
        }

        const athleteProfile = { id: profileId };

        // 2. Criar o convite vinculado a este perfil
        const inviteId = `inv_${Date.now()}`;
        if (!(prisma as any).invitation) {
            console.log("Invitation model missing in Prisma Client, using raw SQL");
            await prisma.$executeRaw`
                INSERT INTO invitations (id, coachId, athleteProfileId, name, email, token, status, createdAt) 
                VALUES (${inviteId}, ${session.user.id}, ${athleteProfile.id}, ${name}, ${email || null}, ${token}, 'PENDING', NOW())
            `;
        } else {
            await (prisma as any).invitation.create({
                data: {
                    id: inviteId,
                    coachId: session.user.id,
                    athleteProfileId: athleteProfile.id,
                    name,
                    email,
                    token,
                    status: "PENDING"
                }
            });
        }

        const host = (await headers()).get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const dynamicBaseUrl = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || "http://localhost:3000");
        const inviteLink = `${dynamicBaseUrl}/convite/${token}`;

        return { success: true, inviteLink, token };
    } catch (error: any) {
        console.error("Error creating invite:", error);
        return { success: false, error: error.message || "Falha ao criar convite" };
    }
}

export async function acceptInviteAction(token: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error("Unauthorized");
        }

        let invitation: any;

        if (!(prisma as any).invitation) {
            const results: any[] = await prisma.$queryRaw`
                SELECT * FROM invitations WHERE token = ${token} LIMIT 1
            `;
            invitation = results[0];
        } else {
            invitation = await (prisma as any).invitation.findUnique({
                where: { token },
                include: { athlete: true }
            });
        }

        if (!invitation || invitation.status !== "PENDING") {
            return { success: false, error: "Convite inválido ou já utilizado" };
        }

        const userId = (session.user as any).id;
        console.log(`[acceptInvite] Attempting to accept invite for user: ${userId}`);

        // VERIFICAÇÃO CRÍTICA: O usuário já possui um perfil de atleta?
        const existingProfile = await prisma.athleteProfile.findUnique({
            where: { userId: userId }
        });

        if (existingProfile) {
            console.log(`[acceptInvite] User already has profile ${existingProfile.id}. Merging/Transferring...`);

            // 1. Atualizamos o perfil existente para o novo treinador
            await prisma.athleteProfile.update({
                where: { id: existingProfile.id },
                data: { coachId: invitation.coachId }
            });

            // 2. Se o convite apontava para um perfil "placeholder", tratamos a migração
            if (existingProfile.id !== invitation.athleteProfileId) {
                // CRÍTICO: Atualizamos o convite ANTES de deletar o perfil, 
                // para que o cascade não apague o registro do convite.
                if (!(prisma as any).invitation) {
                    await prisma.$executeRaw`
                        UPDATE invitations SET athleteProfileId = ${existingProfile.id} WHERE id = ${invitation.id}
                    `;
                } else {
                    await (prisma as any).invitation.update({
                        where: { id: invitation.id },
                        data: { athleteProfileId: existingProfile.id }
                    });
                }

                // Agora deletamos o placeholder que ficou órfão
                try {
                    await prisma.athleteProfile.delete({
                        where: { id: invitation.athleteProfileId }
                    });
                } catch (e) {
                    console.warn(`[acceptInvite] Cleanup warning:`, e);
                }
            }
        } else {
            // Fluxo normal: vinculamos o usuário ao perfil do convite
            console.log(`[acceptInvite] No existing profile. Linking userId ${userId} to profile ${invitation.athleteProfileId}`);
            await prisma.athleteProfile.update({
                where: { id: invitation.athleteProfileId },
                data: { userId: userId }
            });
        }

        // Marcar convite como aceito
        if (!(prisma as any).invitation) {
            await prisma.$executeRaw`
                UPDATE invitations SET status = 'ACCEPTED' WHERE id = ${invitation.id}
            `;
        } else {
            await (prisma as any).invitation.update({
                where: { id: invitation.id },
                data: { status: "ACCEPTED" }
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error accepting invite:", error);
        return { success: false, error: error.message || "Falha ao aceitar convite" };
    }
}

export async function exportAthletesDataAction(athleteIds: string[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "COACH") {
            throw new Error("Unauthorized");
        }

        const athletes = await prisma.athleteProfile.findMany({
            where: {
                id: { in: athleteIds },
                coachId: session.user.id
            },
            include: {
                user: { select: { name: true, email: true } },
                metrics: { orderBy: { date: 'asc' } }
            }
        });

        const csvRows = [];
        // Headers
        csvRows.push(["Atleta", "Email", "Data Nasc.", "Peso (kg)", "Altura (cm)", "Data Registro", "Categoria", "Tipo", "Detalhe", "Resultado", "VO2 Max", "Vmax"].join(","));

        for (const athlete of athletes) {
            const a = athlete as any;
            const name = a.user?.name || "Sem Nome";
            const email = a.user?.email || "--";
            const birthRaw = a.dataNascimento ? new Date(a.dataNascimento).toLocaleDateString('pt-BR') : "--";
            const peso = a.peso?.toString() || "--";
            const altura = a.altura?.toString() || "--";

            if (a.metrics.length === 0) {
                const row = [name, email, birthRaw, peso, altura, "--", "--", "--", "--", "--", "--", "--"].map(val => `"${val.replace(/"/g, '""')}"`);
                csvRows.push(row.join(","));
                continue;
            }

            for (const m of athlete.metrics) {
                const date = new Date(m.date).toLocaleDateString('pt-BR');
                const category = m.category === 'AEROBIC' ? 'Aeróbico' :
                    m.category === 'SPEED' ? 'Velocidade' :
                        m.category === 'STRENGTH' ? 'Força' :
                            m.category === 'RACE' ? 'Prova' :
                                m.category === 'WEIGHT' ? 'Peso' : m.category;

                const type = m.testType || "--";
                const detail = m.exercise || "--";

                let result = m.rawResult.toString();
                if (m.category === 'RACE') {
                    const h = Math.floor(m.rawResult / 3600);
                    const min = Math.floor((m.rawResult % 3600) / 60);
                    const s = Math.round(m.rawResult % 60);
                    result = `${h}h ${min}m ${s}s`.replace(/^0h /, '');
                } else if (m.category === 'STRENGTH') {
                    result = `${m.rawResult} kg`;
                } else if (m.category === 'AEROBIC' || m.category === 'SPEED') {
                    result = `${m.rawResult} m`;
                }

                const vo2 = m.calculatedVo2?.toFixed(1) || "--";
                const vmax = m.calculatedVmax?.toFixed(1) || "--";

                const row = [name, email, birthRaw, peso, altura, date, category, type, detail, result, vo2, vmax].map(val => `"${val.replace(/"/g, '""')}"`);
                csvRows.push(row.join(","));
            }
        }

        // Add BOM for Excel UTF-8 support
        return "\uFEFF" + csvRows.join("\n");
    } catch (error) {
        console.error("Error exporting data:", error);
        return null;
    }
}

export async function calculateWeeklyProgress(athleteId: string, startDate?: string, endDate?: string) {
    try {
        const athlete = await prisma.athleteProfile.findUnique({
            where: { id: athleteId }
        });

        if (!athlete) return null;

        // Buscar gols via SQL (fallback para Prisma desatualizado)
        const rawGoals: any[] = await prisma.$queryRaw`
            SELECT weeklyRunningGoal, weeklyStrengthGoal FROM athleteprofile WHERE id = ${athleteId} LIMIT 1
        `;
        if (rawGoals[0]) {
            (athlete as any).weeklyRunningGoal = rawGoals[0].weeklyRunningGoal;
            (athlete as any).weeklyStrengthGoal = rawGoals[0].weeklyStrengthGoal;
        }

        // Calcular Progresso (Padrão: Segunda a Domingo da semana atual)
        let start = startDate ? new Date(startDate + 'T00:00:00') : null;
        let end = endDate ? new Date(endDate + 'T23:59:59') : null;

        if (!start || !end) {
            const now = new Date();
            const currentDay = now.getDay();
            const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

            const monday = new Date(now);
            monday.setDate(now.getDate() - diffToMonday);
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            if (!start) start = monday;
            if (!end) end = sunday;
        }

        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const weeklyMetrics = await prisma.fitnessMetrics.findMany({
            where: {
                athleteProfileId: athleteId,
                date: { gte: start, lte: end },
                category: { in: ["RACE", "STRENGTH"] }
            }
        });

        let weeklyRunningKm = 0;
        let weeklyStrengthCount = 0;

        weeklyMetrics.forEach((m: any) => {
            if (m.category === "RACE") {
                if (m.calculatedVmax) {
                    const dist = (m.calculatedVmax / 3.6) * m.rawResult / 1000;
                    weeklyRunningKm += dist;
                }
            } else if (m.category === "STRENGTH") {
                weeklyStrengthCount++;
            }
        });

        return {
            startDate: formatDate(start),
            endDate: formatDate(end),
            runningKm: Number(weeklyRunningKm.toFixed(1)),
            runningGoal: (athlete as any).weeklyRunningGoal || 45,
            strengthCount: weeklyStrengthCount,
            strengthGoal: (athlete as any).weeklyStrengthGoal || 3
        };
    } catch (error) {
        console.error("Error calculating weekly progress:", error);
        return null;
    }
}

export async function deleteAthleteAction(athleteId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'COACH') {
            throw new Error("Unauthorized");
        }

        const athlete = await prisma.athleteProfile.findUnique({
            where: { id: athleteId },
            select: { coachId: true, userId: true }
        });

        if (!athlete) throw new Error("Atleta não encontrado");

        if (athlete.coachId !== session.user.id) {
            throw new Error("Não autorizado: este atleta não pertence à sua assessoria.");
        }

        if (athlete.userId) {
            await prisma.user.delete({ where: { id: athlete.userId } });
        } else {
            await prisma.athleteProfile.delete({ where: { id: athleteId } });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting athlete:", error);
        return { success: false, error: error.message || "Erro ao excluir aluno" };
    }
}
