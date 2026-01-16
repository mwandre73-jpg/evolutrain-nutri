const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Limpando banco de dados...');

    // Ordem de deleção respeitando FKs
    await prisma.fitnessMetrics.deleteMany();
    await prisma.athleteProfile.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log('Banco de dados limpo com sucesso!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
