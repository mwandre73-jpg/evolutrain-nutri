const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllWorkouts() {
    const workouts = await prisma.workouts.findMany({
        include: {
            athlete: {
                include: {
                    user: true
                }
            }
        }
    });

    console.log(`Total Workouts: ${workouts.length}`);
    workouts.forEach(w => {
        console.log(`- ID: ${w.id}, Date: ${w.date.toISOString()}, Athlete: ${w.athlete?.user?.name} (${w.athlete?.user?.email}), ProfileID: ${w.athleteProfileId}`);
    });
}

listAllWorkouts()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
