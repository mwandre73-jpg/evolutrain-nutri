
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    const athleteProfileId = 'athlete_1767281669723'; // Marcio Wandré

    await prisma.fitnessMetrics.create({
        data: {
            id: uuidv4(),
            athleteProfileId,
            date: today,
            category: "RACE",
            testType: "STRAVA_IMPORT",
            exercise: "Verificação Teste (5.00 km)",
            rawResult: 1545, // 25:45
            calculatedVmax: 11.65,
            calculatedVo2: 0
        }
    });

    console.log("Mock activity created for today.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
