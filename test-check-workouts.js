
const { checkAthletesWorkoutsAction } = require('./src/app/actions/workouts');

async function test() {
    const res = await checkAthletesWorkoutsAction('2026-05-01');
    console.log(res);
}

test();
