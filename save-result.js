
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const results = await prisma.$queryRaw`
    SELECT * FROM fitnessmetrics WHERE rawResult = 1146 LIMIT 1
  `;
    fs.writeFileSync('result_1146.json', JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
