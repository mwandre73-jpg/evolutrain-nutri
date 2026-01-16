const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const athleteId = 'athlete_1767281669723';
    const newGender = 'M';
    try {
        console.log(`Manually updating athlete ${athleteId} to gender ${newGender}...`);
        const count = await prisma.$executeRawUnsafe(`
      UPDATE athleteprofile SET gender = '${newGender}' WHERE id = '${athleteId}'
    `);
        console.log("Rows affected:", count);

        const results = await prisma.$queryRawUnsafe(`
      SELECT id, gender FROM athleteprofile WHERE id = '${athleteId}'
    `);
        console.log("Verification Result:", results);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
