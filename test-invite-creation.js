const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { randomBytes } = require('crypto');

async function main() {
    try {
        const coachId = 'coach_1';
        const token = randomBytes(32).toString('hex');

        console.log('Creating profile...');
        const profile = await prisma.athleteProfile.create({
            data: {
                id: 'test_profile_' + Date.now(),
                coachId: coachId,
            }
        });
        console.log('Profile created:', profile.id);

        console.log('Creating invitation...');
        // Use raw query if model is missing in client, or try normal if it exists
        if (prisma.invitation) {
            const invite = await prisma.invitation.create({
                data: {
                    coachId,
                    athleteProfileId: profile.id,
                    name: 'Test Student',
                    token,
                    status: 'PENDING'
                }
            });
            console.log('Invite created via Prisma:', invite.id);
        } else {
            console.log('Invitation model not in client, trying raw SQL...');
            await prisma.$executeRaw`INSERT INTO invitations (id, coachId, athleteProfileId, name, token, status, createdAt) VALUES (${'inv_' + Date.now()}, ${coachId}, ${profile.id}, ${'Test Student'}, ${token}, 'PENDING', NOW())`;
            console.log('Invite created via Raw SQL');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
