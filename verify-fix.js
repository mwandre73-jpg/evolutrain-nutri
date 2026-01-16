
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const athletes = await prisma.athleteProfile.findMany({
        include: {
            user: { select: { name: true } },
            metrics: {
                where: { testType: { not: 'STRAVA_IMPORT' } },
                orderBy: { date: 'desc' },
                take: 1
            }
        }
    });

    const marcio = athletes.find(a => a.user?.name === "Marcio Wandré" || a.id === "athlete_1767281669723");

    if (marcio) {
        console.log(`Athlete: ${marcio.user?.name}`);
        console.log(`Last Metric (Filtered):`, JSON.stringify(marcio.metrics[0], null, 2));
    } else {
        console.log("Marcio not found.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
