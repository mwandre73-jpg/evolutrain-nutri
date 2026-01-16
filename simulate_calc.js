const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calcularVelocidadePorClassificacao, kmhParaPace } = require('./src/lib/calculos');

async function main() {
    const athleteId = 'athlete_1767281669723'; // Marcio
    const athlete = await prisma.athleteProfile.findUnique({
        where: { id: athleteId },
        include: { metrics: { orderBy: { date: 'desc' } } }
    });

    if (!athlete) {
        console.log('Athlete not found');
        return;
    }

    const latestAerobic = athlete.metrics.find((m) => m.category === 'AEROBIC');
    console.log('--- DATA ---');
    console.log('Latest Aerobic Metric:', JSON.stringify(latestAerobic, null, 2));

    const vmax = latestAerobic ? latestAerobic.calculatedVmax : 0;
    const classification = 'CRM';
    const customPercent = 0;

    console.log('--- CALC ---');
    const speed = calcularVelocidadePorClassificacao(vmax, classification, customPercent);
    const paceSecs = speed > 0 ? 3600 / speed : 0;
    const paceStr = kmhParaPace(speed);

    console.log('Speed (km/h):', speed);
    console.log('Pace (min/km):', paceStr);
    console.log('Pace (s/km):', paceSecs);

    const dist = 2000;
    const totalSeconds = (paceSecs * dist) / 1000;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    console.log(`Result for ${dist}m: ${m}m ${s < 10 ? '0' : ''}${s}s`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
