const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugIds() {
    const user = await prisma.user.findUnique({
        where: { email: 'aluno1@evolutrain.com' },
        include: { athleteProfile: true }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User ID:', user.id);
    console.log('Profile ID:', user.athleteProfile?.id);
    console.log('Profile User ID:', user.athleteProfile?.userId);

    const workouts = await prisma.workouts.findMany({
        where: { athleteProfileId: user.athleteProfile?.id }
    });
    console.log('Workouts count for athleteProfileId:', workouts.length);

    const allProfiles = await prisma.athleteProfile.findMany({
        include: { user: true }
    });
    console.log('Total Athlete Profiles:', allProfiles.length);
    allProfiles.forEach(p => {
        console.log(`- Profile: ${p.id}, User: ${p.user.name} (${p.user.email}), UserID in Profile: ${p.userId}`);
    });
}

debugIds()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
