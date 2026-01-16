
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
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
        fs.writeFileSync('metrics_dump.json', JSON.stringify({ error: "No athlete found" }));
        return;
    }

    const data = {
        athlete: marcio.user?.name || "Sem Nome",
        id: marcio.id,
        metrics: marcio.metrics
    };

    fs.writeFileSync('metrics_dump.json', JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
