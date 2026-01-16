const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const idsToKeep = [
        'profile_athlete_1',
        'profile_athlete_2',
        'profile_athlete_3',
        'athlete_1767281669723',
        'athlete_1767281369685'
    ];

    console.log('Cleaning up profiles NOT IN:', idsToKeep);

    const result = await prisma.athleteProfile.deleteMany({
        where: { id: { notIn: idsToKeep } }
    });

    console.log('Cleaned:', result);

    // Check invitations table to see if we can delete some there too
    const invIdsToKeep = [
        'inv_1767281669641',
        'inv_1767281369614'
    ];

    const invResult = await prisma.$executeRaw`DELETE FROM invitations WHERE id NOT IN ('inv_1767281669641', 'inv_1767281369614')`;
    console.log('Inv Cleaned:', invResult);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
