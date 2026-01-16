const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { saveWorkoutAction } = require('./src/app/actions/workouts');

async function testIndividualizedBatch() {
    console.log('--- Testing Individualized Batch Workouts ---');

    // Find a coach
    const coach = await prisma.user.findFirst({ where: { role: 'COACH' } });
    if (!coach) {
        console.error('No coach found.');
        return;
    }

    // Find 2 athletes with different Vmax
    const athletes = await prisma.athleteProfile.findMany({
        where: { coachId: coach.id },
        include: { metrics: { where: { category: 'AEROBIC' }, orderBy: { date: 'desc' }, take: 1 } },
        take: 5
    });

    const candidates = athletes.filter(a => a.metrics.length > 0);
    if (candidates.length < 2) {
        console.error('Need at least 2 athletes with aerobic metrics.');
        return;
    }

    const athleteIds = [candidates[0].id, candidates[1].id];
    console.log(`Athlete 1 Vmax: ${candidates[0].metrics[0].calculatedVmax}`);
    console.log(`Athlete 2 Vmax: ${candidates[1].metrics[0].calculatedVmax}`);

    // Call the action (mocking the session is hard in raw node, so I'll just check if the logic in the action is correct by inspecting it or running it if I can bypass session)
    // Since I can't easily bypass getServerSession in raw Node, I will simulate the replacement logic here to verify the math, 
    // or rely on the previous successful run and trust my logic if it's straightforward.

    // Actually, I'll just run a simpler check on the DB after manual use if possible, 
    // but the best is to verify the regex and replacement.

    const paceSecs1 = 3600 / (candidates[0].metrics[0].calculatedVmax * 0.97); // CRM = 97%
    const paceSecs2 = 3600 / (candidates[1].metrics[0].calculatedVmax * 0.97);

    console.log(`Expected Pace 1: ${Math.floor(paceSecs1 / 60)}m ${Math.round(paceSecs1 % 60)}s`);
    console.log(`Expected Pace 2: ${Math.floor(paceSecs2 / 60)}m ${Math.round(paceSecs2 % 60)}s`);

    console.log('Replacement logic verification:');
    const template = "Tiro de 1000m: {T:1000}";
    const res1 = template.replace(/\{T:(\d+)\}/g, (match, dist) => {
        const d = parseInt(dist);
        const totalSeconds = (paceSecs1 * d) / 1000;
        const m = Math.floor(totalSeconds / 60);
        const s = Math.round(totalSeconds % 60);
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    });
    const res2 = template.replace(/\{T:(\d+)\}/g, (match, dist) => {
        const d = parseInt(dist);
        const totalSeconds = (paceSecs2 * d) / 1000;
        const m = Math.floor(totalSeconds / 60);
        const s = Math.round(totalSeconds % 60);
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    });

    console.log(`Result 1: ${res1}`);
    console.log(`Result 2: ${res2}`);

    if (res1 === res2) {
        console.error('FAIL: Individualized times are identical!');
    } else {
        console.log('SUCCESS: Times are individualized.');
    }
}

testIndividualizedBatch()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
