const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAthletes() {
    try {
        const athletes = await prisma.athleteProfile.findMany({
            include: { user: true }
        });
        console.log('--- Atletas Cadastrados ---');
        athletes.forEach(a => {
            console.log(`ID: ${a.id} | Nome: ${a.user.name} | Email: ${a.user.email}`);
        });
    } catch (error) {
        console.error('Erro ao listar atletas:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listAthletes();
