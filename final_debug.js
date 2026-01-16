const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const athlete = await prisma.athleteProfile.findFirst({
        where: { user: { name: { contains: 'Marcio' } } },
        include: { metrics: true }
    });

    console.log(`Athlete: ${athlete.id}`);
    athlete.metrics.forEach(m => {
        console.log(`ID: ${m.id} | Cat: ${m.category} | Vmax: ${m.calculatedVmax} | Date: ${m.date}`);
    });
}

main().finally(() => prisma.$disconnect());
