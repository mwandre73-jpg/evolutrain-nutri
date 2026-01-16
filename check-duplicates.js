const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
    const users = await prisma.user.findMany({
        where: { name: { contains: 'Joao' } },
        include: {
            athleteProfile: {
                include: {
                    workouts: true
                }
            }
        }
    });

    console.log(`Found ${users.length} users with name 'Joao'`);
    users.forEach(u => {
        console.log(`- User: ${u.name}, Email: ${u.email}, ID: ${u.id}`);
        console.log(`  Profile ID: ${u.athleteProfile?.id}`);
        console.log(`  Workouts: ${u.athleteProfile?.workouts.length || 0}`);
    });
}

checkDuplicates()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
