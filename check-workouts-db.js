const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkouts() {
    const user = await prisma.user.findFirst({
        where: { email: 'aluno1@evolutrain.com' },
        include: {
            athleteProfile: {
                include: {
                    workouts: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User: ${user.name} (${user.id})`);
    console.log(`Athlete Profile ID: ${user.athleteProfile?.id}`);
    console.log('Workouts:');
    user.athleteProfile?.workouts.forEach(w => {
        console.log(`- ID: ${w.id}, Date: ${w.date.toISOString()}, Completed: ${w.completed}, Type: ${w.type}`);
    });
}

checkWorkouts()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
