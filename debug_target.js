const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTarget() {
    const athlete = await prisma.athleteProfile.findFirst({
        where: { user: { name: { contains: 'Marcio' } } },
        include: { metrics: { orderBy: { date: 'desc' } } }
    });

    console.log(`Athlete: ${athlete.user?.name}`);
    const latestAero = athlete.metrics.find(m => m.category === 'AEROBIC');
    console.log('--- LATEST AEROBIC ---');
    console.log(JSON.stringify(latestAero, null, 2));

    const latestAny = athlete.metrics[0];
    console.log('--- LATEST ANY ---');
    console.log(JSON.stringify(latestAny, null, 2));
}

debugTarget().finally(() => prisma.$disconnect());
