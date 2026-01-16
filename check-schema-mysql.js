const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables:', tables);

        const descInvitation = await prisma.$queryRaw`DESCRIBE invitations`;
        console.log('Descriptions for invitations:', descInvitation);

        const descAthleteProfile = await prisma.$queryRaw`DESCRIBE athleteprofile`;
        console.log('Descriptions for athleteprofile:', descAthleteProfile);
    } catch (e) {
        console.error('Error checking schema:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
