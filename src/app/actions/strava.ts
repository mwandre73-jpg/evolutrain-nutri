"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function getStravaAuthUrl() {
    const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
    const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI;
    const scope = "read,activity:read_all";
    return `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&approval_prompt=force`;
}

export async function exchangeStravaCodeAction(code: string) {
    const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
    const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

    const session = await (getServerSession as any)(authOptions);
    if (!session?.user?.id) return { error: "Não autorizado" };

    try {
        const response = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
            }),
        });

        const data = await response.json();

        if (data.errors) {
            console.error("Strava Auth Error:", data.errors);
            return { error: "Erro na autorização do Strava" };
        }

        const profile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!profile) return { error: "Perfil de atleta não encontrado" };

        // Save or update integration
        await prisma.integrations.upsert({
            where: { id: `strava_${profile.id}` }, // Simplified ID for upsert
            update: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.expires_at * 1000),
            },
            create: {
                id: `strava_${profile.id}`,
                athleteProfileId: profile.id,
                type: "STRAVA",
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.expires_at * 1000),
            },
        });

        return { success: true };
    } catch (error) {
        console.error("exchangeStravaCodeAction error:", error);
        return { error: "Falha ao conectar com Strava" };
    }
}

export async function disconnectStravaAction() {
    const session = await (getServerSession as any)(authOptions);
    if (!session?.user?.id) return { error: "Não autorizado" };

    try {
        const profile = await prisma.athleteProfile.findUnique({
            where: { userId: session.user.id }
        });

        if (!profile) return { error: "Perfil não encontrado" };

        await prisma.integrations.deleteMany({
            where: { athleteProfileId: profile.id, type: "STRAVA" }
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { error: "Erro ao desconectar Strava" };
    }
}

async function getValidAccessToken(athleteProfileId: string) {
    const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
    const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

    const integration = await prisma.integrations.findFirst({
        where: { athleteProfileId, type: "STRAVA" }
    });

    if (!integration) return null;

    // Check if expired (with 1 min buffer)
    if (new Date() < new Date(integration.expiresAt.getTime() - 60000)) {
        return integration.accessToken;
    }

    // Refresh token
    try {
        const response = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: integration.refreshToken,
                grant_type: "refresh_token",
            }),
        });

        const data = await response.json();

        await prisma.integrations.update({
            where: { id: integration.id },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.expires_at * 1000),
            }
        });

        return data.access_token;
    } catch (error) {
        console.error("Error refreshing Strava token:", error);
        return null;
    }
}

export async function syncStravaActivitiesAction() {
    const session = await (getServerSession as any)(authOptions);
    if (!session?.user?.id) return { error: "Não autorizado" };

    const profile = await prisma.athleteProfile.findUnique({
        where: { userId: session.user.id },
        include: { metrics: true }
    });

    if (!profile) return { error: "Perfil não encontrado" };

    const token = await getValidAccessToken(profile.id);
    if (!token) return { error: "Strava não conectado ou token inválido" };

    try {
        // Fetch last 10 activities
        const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=10`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const activities = await response.json();
        console.log(`[StravaSync] Found ${activities.length} total activities for runner ${profile.id}`);

        let importedCount = 0;

        for (const activity of activities) {
            // Only Run or VirtualRun or TrailRun
            const allowedTypes = ['Run', 'VirtualRun', 'TrailRun'];
            if (!allowedTypes.includes(activity.type)) {
                console.log(`[StravaSync] Skipping activity ${activity.id} of type ${activity.type}`);
                continue;
            }

            const activityDate = new Date(activity.start_date_local);

            // Avoid duplicates: check if activity with same date and distance already exists
            const exists = profile.metrics.some(m =>
                m.category === 'RACE' &&
                Math.abs(m.rawResult - activity.moving_time) < 5 && // Close enough time
                (m.calculatedVmax !== null && Math.abs(m.calculatedVmax - (activity.average_speed * 3.6)) < 0.1) // Close enough avg speed
            );

            if (exists) continue;

            // Import as RACE metric
            const distanceKm = (activity.distance / 1000).toFixed(2);
            const activityName = `${activity.name} (${distanceKm} km)`;

            await prisma.fitnessMetrics.create({
                data: {
                    id: randomUUID(),
                    athleteProfileId: profile.id,
                    date: activityDate,
                    category: "RACE",
                    testType: "STRAVA_IMPORT",
                    exercise: activityName,
                    rawResult: activity.moving_time, // In seconds for RACE category
                    calculatedVmax: activity.average_speed * 3.6, // Convert m/s to km/h
                    calculatedVo2: 0, // Placeholder or calculate if possible
                }
            });
            importedCount++;
        }

        console.log(`[StravaSync] Finished. Imported ${importedCount} new activities.`);

        revalidatePath("/dashboard");
        return { success: true, count: importedCount };
    } catch (error) {
        console.error("syncStravaActivitiesAction error:", error);
        return { error: "Erro ao sincronizar atividades" };
    }
}
