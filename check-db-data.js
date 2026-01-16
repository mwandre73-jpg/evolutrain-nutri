const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables:', JSON.stringify(tables, null, 2));

        const checkInvitations = await prisma.$queryRaw`SELECT 1 FROM invitations LIMIT 1`.catch(e => e.message);
        console.log('Check invitations table:', checkInvitations);

        const checkProfiles = await prisma.$queryRaw`SELECT 1 FROM athleteprofile LIMIT 1`.catch(e => e.message);
        console.log('Check athleteprofile table:', checkProfiles);

        const countUsers = await prisma.user.count();
        console.log('User count:', countUsers);
    } catch (e) {
        console.error('Fatal error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
