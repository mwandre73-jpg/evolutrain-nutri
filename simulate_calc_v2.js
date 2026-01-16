const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Exact formulas from src/lib/calculos.ts
const calcularLAN = (vmax) => vmax * 0.89;
const calcularVelocidadePorClassificacao = (vmax, classificacao, percentualManual) => {
    const lan = calcularLAN(vmax);
    if (percentualManual) return lan * (percentualManual / 100);

    switch (classificacao) {
        case 'CRM': return lan * 0.97;
        case 'CL': return lan * 0.92;
        case 'Z1': return vmax * 0.65;
        case 'Z2': return vmax * 0.75;
        case 'Z3': return vmax * 0.85;
        case 'IE': return vmax * 0.95;
        default: return lan;
    }
};

async function main() {
    const athleteId = 'athlete_1767281669723';
    const athlete = await prisma.athleteProfile.findUnique({
        where: { id: athleteId },
        include: { metrics: { orderBy: { date: 'desc' } } }
    });

    const latestAerobic = athlete.metrics.find(m => m.category === 'AEROBIC');
    console.log('--- TEST 1: CRM with Vmax 17.5 ---');
    const vmax = 17.5;
    const speed = calcularVelocidadePorClassificacao(vmax, 'CRM', 0);
    const paceSecs = 3600 / speed;
    console.log('Speed:', speed.toFixed(2));
    console.log('Pace (s/km):', paceSecs.toFixed(2));
    console.log('2000m:', ((paceSecs * 2000) / 1000).toFixed(0), 'seconds');

    console.log('\n--- TEST 2: Server Retrieval ---');
    if (latestAerobic) {
        console.log('Latest Vmax from DB:', latestAerobic.calculatedVmax);
        const s2 = calcularVelocidadePorClassificacao(latestAerobic.calculatedVmax, 'CRM', 0);
        const p2 = 3600 / s2;
        console.log('Speed from DB data:', s2.toFixed(2));
        console.log('2000m from DB data:', ((p2 * 2000) / 1000).toFixed(0), 'seconds');
    }
}

main().finally(() => prisma.$disconnect());
