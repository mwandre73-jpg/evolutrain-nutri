const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Adding gender column to athleteprofile...");
        await prisma.$executeRawUnsafe(`
      ALTER TABLE athleteprofile ADD COLUMN IF NOT EXISTS gender VARCHAR(10) NULL AFTER idade;
    `);
        console.log("Column added successfully or already exists.");
    } catch (error) {
        if (error.message.includes("Duplicate column name")) {
            console.log("Column 'gender' already exists.");
        } else {
            console.error("Error adding column:", error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
