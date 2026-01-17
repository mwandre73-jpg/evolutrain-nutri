
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log("Starting migration...");
        const workouts = await prisma.workouts.findMany({
            where: { type: "Musculação" },
            include: { exercises: true }
        });

        const library = await prisma.exercise.findMany();
        console.log(`Found ${workouts.length} bodybuilding workouts.`);

        for (const workout of workouts) {
            if (workout.exercises.length > 0) {
                console.log(`Workout ${workout.id} already has structured exercises.`);
                continue;
            }

            console.log(`Processing workout ${workout.id}...`);
            const lines = workout.description.split('\n');
            let order = 0;

            for (const line of lines) {
                // Match "- Exercise Name: 3x12: 40kg (85%)" or similar
                const match = line.match(/- (.*?): (\d+)x(\d+)(?::\s*([\d.]+)kg)?/);
                if (match) {
                    const name = match[1].trim();
                    const sets = parseInt(match[2]);
                    const reps = parseInt(match[3]);
                    const weight = match[4] ? parseFloat(match[4]) : null;

                    const exercise = library.find(ex => ex.name.toLowerCase() === name.toLowerCase());
                    if (exercise) {
                        console.log(`  Linking ${name} to exercise ${exercise.id}`);
                        await prisma.workoutExercise.create({
                            data: {
                                workoutId: workout.id,
                                exerciseId: exercise.id,
                                sets,
                                reps,
                                weight,
                                order: order++
                            }
                        });
                    } else {
                        console.log(`  Exercise ${name} not found in library.`);
                    }
                }
            }
        }

        console.log("Migration finished!");
    } catch (e) {
        console.error("MIGRATION ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
