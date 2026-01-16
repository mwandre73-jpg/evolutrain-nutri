
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`Checking for activities between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);

    const coachId = 'clq21110h0000t7g2130310v7'; // Coach ID from previous searches

    const studentActivities = await prisma.fitnessMetrics.findMany({
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
                    user: {
                        select: { name: true }
                    }
                }
            }
        }
    });

    console.log(`Found ${studentActivities.length} activities for today.`);
    if (studentActivities.length > 0) {
        console.log(JSON.stringify(studentActivities.map(a => ({
            athlete: a.athlete.user.name,
            exercise: a.exercise,
            date: a.date
        })), null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
