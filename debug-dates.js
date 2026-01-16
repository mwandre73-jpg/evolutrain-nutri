
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`Current Time: ${new Date().toISOString()}`);
    console.log(`Query Range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    const allStats = await prisma.fitnessMetrics.findMany({
        where: { testType: 'STRAVA_IMPORT' },
        orderBy: { date: 'desc' },
        take: 5
    });

    console.log("Last 5 Strava Imports:");
    allStats.forEach(a => {
        console.log(`ID: ${a.id}, Date: ${a.date.toISOString()}, Exercise: ${a.exercise}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
