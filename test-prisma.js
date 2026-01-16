const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log("Starting Prisma diagnostic...");
    try {
        const prisma = new PrismaClient({
            log: ['info', 'query', 'warn', 'error'],
        });
        console.log("PrismaClient instantiated.");
        await prisma.$connect();
        console.log("Connected successfully!");
        const users = await prisma.user.findMany();
        console.log("Users count:", users.length);
        await prisma.$disconnect();
    } catch (e) {
        console.error("Prisma Error Catch Block:");
        console.error(e);
        process.exit(1);
    }
}

main();
