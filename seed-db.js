const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando seed...');

    // 1. Criar Treinador
    const coach = await prisma.user.upsert({
        where: { email: 'treinador@evolutrain.com' },
        update: {},
        create: {
            id: 'coach_1', // Mantendo o ID do modo de teste do NextAuth
            email: 'treinador@evolutrain.com',
            name: 'Treinador Admin',
            role: 'COACH',
        },
    });
    console.log('Treinador criado/verificado:', coach.email);

    // 2. Criar Alunos/Atletas
    const studentsRaw = [
        { id: 'athlete_1', email: 'aluno1@evolutrain.com', name: 'João Silva' },
        { id: 'athlete_2', email: 'aluno2@evolutrain.com', name: 'Maria Oliveira' },
        { id: 'athlete_3', email: 'aluno3@evolutrain.com', name: 'Carlos Santos' },
    ];

    for (const s of studentsRaw) {
        const student = await prisma.user.upsert({
            where: { email: s.email },
            update: { name: s.name },
            create: {
                id: s.id,
                email: s.email,
                name: s.name,
                role: 'ATHLETE',
            },
        });
        console.log('Aluno criado/verificado:', student.email);

        // 3. Criar Perfil de Atleta vinculado ao Treinador
        const profile = await prisma.athleteProfile.upsert({
            where: { userId: student.id },
            update: {
                coachId: coach.id,
                peso: Math.floor(Math.random() * (90 - 60 + 1) + 60),
                altura: Number((Math.random() * (1.95 - 1.55) + 1.55).toFixed(2)),
                idade: Math.floor(Math.random() * (45 - 20 + 1) + 20),
            },
            create: {
                id: `profile_${s.id}`,
                userId: student.id,
                coachId: coach.id,
                peso: Math.floor(Math.random() * (90 - 60 + 1) + 60),
                altura: Number((Math.random() * (1.95 - 1.55) + 1.55).toFixed(2)),
                idade: Math.floor(Math.random() * (45 - 20 + 1) + 20),
            },
        });
        console.log('Perfil de atleta criado para:', student.name);
    }

    console.log('Seed finalizado com sucesso!');
}

main()
    .catch((e) => {
        console.error('Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
