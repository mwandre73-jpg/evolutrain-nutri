const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAllMetrics() {
    const athlete = await prisma.athleteProfile.findFirst({
        where: { user: { name: { contains: 'Marcio' } } },
        include: { metrics: true }
    });
    console.log(`Athlete: ${athlete.user?.name || 'Unknown'}`);
    athlete.metrics.forEach(m => {
        console.log(`${m.date.toISOString()} | ${m.category} | ${m.testType} | Vmax: ${m.calculatedVmax} | Vo2: ${m.calculatedVo2} | Raw: ${m.rawResult}`);
    });
}

debugAllMetrics().finally(() => prisma.$disconnect());
