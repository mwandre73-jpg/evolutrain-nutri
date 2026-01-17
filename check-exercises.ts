
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
    try {
        const exercises = await prisma.exercise.findMany();
        console.log("TOTAL EXERCISES:", exercises.length);
        console.log(JSON.stringify(exercises, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
