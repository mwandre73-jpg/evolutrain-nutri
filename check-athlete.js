const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const athleteId = 'athlete_1767281669723'; // ID from the user's screenshot
    try {
        console.log(`Checking athlete ${athleteId}...`);
        const results = await prisma.$queryRawUnsafe(`
      SELECT id, gender, peso, altura FROM athleteprofile WHERE id = '${athleteId}'
    `);
        console.log("Raw Database Result:", results);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
