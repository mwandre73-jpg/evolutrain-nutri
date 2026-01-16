const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSave() {
    try {
        console.log('Tentando salvar métrica de teste...');
        const metric = await prisma.fitnessMetrics.create({
            data: {
                id: `debug_${Date.now()}`,
                athleteProfileId: 'profile_1',
                category: 'AEROBIC',
                testType: 'esforco',
                rawResult: 15,
                calculatedVo2: 60.04,
                calculatedVmax: 16.82,
            }
        });
        console.log('Sucesso:', metric);
    } catch (error) {
        console.error('ERRO DETALHADO:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugSave();
