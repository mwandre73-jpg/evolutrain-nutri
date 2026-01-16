
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const marcio = await prisma.athleteProfile.findFirst({
        where: {
            OR: [
                { user: { name: { contains: "Marcio" } } },
                { id: { contains: "athlete" } }
            ]
        },
        include: {
            user: true,
            metrics: {
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!marcio) {
        console.log("No athlete found containing 'Marcio'.");
        return;
    }

    console.log(`Athlete: ${marcio.user?.name || "Sem Nome"} (ID: ${marcio.id})`);
    marcio.metrics.forEach(m => {
        console.log(`--- [${m.date.toISOString().split('T')[0]}] ---`);
        console.log(`ID: ${m.id}`);
        console.log(`Category: ${m.category}`);
        console.log(`Test: ${m.testType}`);
        console.log(`Result: ${m.rawResult}`);
        console.log(`VO2: ${m.calculatedVo2}`);
        console.log(`Vmax: ${m.calculatedVmax}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
