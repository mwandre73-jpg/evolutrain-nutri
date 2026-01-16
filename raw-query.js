
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const results = await prisma.$queryRaw`
    SELECT * FROM fitnessmetrics WHERE rawResult = 1146 LIMIT 1
  `;
    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
