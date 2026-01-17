
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EXERCICIOS_BASE = {
    SUPERIORES: [
        "Supino Reto", "Peck Deck", "Desenvolvimento", "Elevação Lateral",
        "Puxada Aberta", "Remada Curvada", "Rosca Direta", "Tríceps Pulley",
        "Flexão de Braços", "Remada Baixa"
    ],
    INFERIORES: [
        "Agachamento Livre", "Leg Press 45", "Cadeira Extensora", "Mesa Flexora",
        "Afundo", "Panturrilha Sentado", "Levantamento Terra", "Cadeira Adutora",
        "Cadeira Abdutora", "Stiff"
    ]
};

async function seed() {
    try {
        console.log("Starting seed...");

        const all = [
            ...EXERCICIOS_BASE.SUPERIORES.map(n => ({ name: n, muscle: 'Superiores' })),
            ...EXERCICIOS_BASE.INFERIORES.map(n => ({ name: n, muscle: 'Inferiores' }))
        ];

        for (const item of all) {
            const existing = await prisma.exercise.findFirst({ where: { name: item.name } });
            if (!existing) {
                console.log(`Creating ${item.name}...`);
                await prisma.exercise.create({
                    data: {
                        name: item.name,
                        muscles: item.muscle,
                        instructions: `Execução correta do ${item.name}. Mantenha a postura e controle a carga.`
                    }
                });
            } else {
                console.log(`${item.name} already exists.`);
            }
        }

        console.log("Seed finished!");
    } catch (e) {
        console.error("SEED ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
