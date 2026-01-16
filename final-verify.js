
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const coachId = 'clq21110h0000t7g2130310v7';

    console.log(`Searching for coach: ${coachId}`);
    console.log(`Range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    const activities = await prisma.fitnessMetrics.findMany({
        where: {
            athlete: { coachId },
            testType: 'STRAVA_IMPORT',
            date: {
                gte: todayStart,
                lt: todayEnd
            }
        },
        include: {
            athlete: {
                include: {
                    user: { select: { name: true } }
                }
            }
        }
    });

    console.log(`Results: ${activities.length} activities found.`);
    activities.forEach(a => {
        console.log(`- Athlete: ${a.athlete.user.name}, Exercise: ${a.exercise}, Date: ${a.date.toISOString()}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
