
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const activities = await prisma.fitnessMetrics.findMany({
        where: { testType: 'STRAVA_IMPORT' },
        include: {
            athlete: {
                select: { id: true, coachId: true }
            }
        },
        orderBy: { date: 'desc' },
        take: 3
    });

    console.log("Recent Strava Imports Data:");
    activities.forEach(a => {
        console.log(`Metric ID: ${a.id}`);
        console.log(`Activity Date: ${a.date.toISOString()}`);
        console.log(`Athlete Profile ID: ${a.athleteProfileId}`);
        console.log(`Athlete Coach ID: ${a.athlete.coachId}`);
        console.log("---");
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
