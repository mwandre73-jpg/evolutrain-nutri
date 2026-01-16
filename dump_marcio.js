const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const athlete = await prisma.athleteProfile.findFirst({
        where: { user: { name: { contains: 'Marcio' } } },
        include: { metrics: true }
    });
    if (!athlete) {
        console.log('Athlete not found');
        return;
    }
    fs.writeFileSync('marcio_metrics.json', JSON.stringify(athlete.metrics, null, 2), 'utf8');
    console.log(`Dumped ${athlete.metrics.length} metrics for ${athlete.user?.name || athlete.id}`);
}
main().finally(() => prisma.$disconnect());
