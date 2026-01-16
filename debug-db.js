const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('--- DATABASE_URL ---');
        console.log(process.env.DATABASE_URL ? 'Loaded' : 'NOT LOADED');

        console.log('\n--- USERS ---');
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true }
        });
        console.log(JSON.stringify(users, null, 2));

        console.log('\n--- PROFILES ---');
        const profiles = await prisma.athleteProfile.findMany({
            include: {
                user: { select: { name: true, email: true } },
                integrations: true
            }
        });
        console.log(JSON.stringify(profiles, null, 2));

    } catch (e) {
        console.error('ERROR during execution:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
