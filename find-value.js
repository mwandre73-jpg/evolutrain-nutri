
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const metrics = await prisma.fitnessMetrics.findMany({
        where: {
            OR: [
                { rawResult: 1146 },
                { rawResult: 1146.0 }
            ]
        },
        include: {
            athlete: {
                include: { user: true }
            }
        }
    });

    console.log("Found metrics:", JSON.stringify(metrics, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
