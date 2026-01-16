const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const athlete = await prisma.athleteProfile.findFirst({
        where: { user: { name: { contains: 'Marcio' } } },
        include: { metrics: { orderBy: { date: 'desc' }, take: 1 } }
    });
    console.log('--- METRIC ---');
    console.log(JSON.stringify(athlete.metrics[0], null, 2));

    const workout = await prisma.workouts.findFirst({
        where: { athleteProfileId: athlete.id },
        orderBy: { date: 'desc' }
    });
    console.log('--- WORKOUT ---');
    console.log(JSON.stringify(workout, null, 2));
}

debug().finally(() => prisma.$disconnect());
