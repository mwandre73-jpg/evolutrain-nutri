const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const descUser = await prisma.$queryRaw`DESCRIBE user`;
        console.log('Descriptions for user:', descUser);
    } catch (e) {
        console.error('Error checking user table:', e.message);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
