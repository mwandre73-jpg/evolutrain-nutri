const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const coachId = 'coach_1';

        const profiles = await prisma.athleteProfile.findMany({
            where: { coachId },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        console.log('--- Athlete Profiles for Coach 1 ---');
        console.log(JSON.stringify(profiles.map(p => ({
            id: p.id,
            userId: p.userId,
            userName: p.user?.name,
            userEmail: p.user?.email
        })), null, 2));

        const invitations = await prisma.$queryRaw`SELECT * FROM invitations`;
        console.log('\n--- All Invitations ---');
        console.log(invitations);

        const users = await prisma.user.findMany({
            where: { role: 'ATHLETE' }
        });
        console.log('\n--- All Athletes (Users) ---');
        console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email })));

    } catch (e) {
        console.error('Fatal error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
