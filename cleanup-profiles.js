const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Cleaning up orphaned profiles ---');

        // 1. Get all profiles
        const allProfiles = await prisma.athleteProfile.findMany();

        // 2. Get all invitations
        const invitations = await prisma.$queryRaw`SELECT athleteProfileId FROM invitations`;
        const invitationIds = invitations.map(i => i.athleteProfileId);

        const toDelete = [];
        for (const p of allProfiles) {
            // Se não tem userId E não está na lista de convites, é um órfão de erro
            if (!p.userId && !invitationIds.includes(p.id)) {
                toDelete.push(p.id);
            }
        }

        console.log(`Found ${toDelete.length} orphaned profiles to delete:`, toDelete);

        if (toDelete.length > 0) {
            await prisma.athleteProfile.deleteMany({
                where: { id: { in: toDelete } }
            });
            console.log('Orphaned profiles deleted successfully.');
        } else {
            console.log('No orphaned profiles found.');
        }

    } catch (e) {
        console.error('Fatal error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
