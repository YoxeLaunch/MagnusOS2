import { initSystemDb, Mentor } from '../models/system/index.js';

const checkMentors = async () => {
    await initSystemDb();
    const mentors = await Mentor.findAll();

    console.log('--- MENTOR DATA IN DB ---');
    mentors.forEach(m => {
        console.log(`[${m.name}]`);
        console.log(`   ID: ${m.id}`);
        console.log(`   Range: ${m.startDate}  ->  ${m.endDate}`);
        // Check if types are string or Date object
        console.log(`   Type: ${typeof m.startDate}`);
    });
};

checkMentors();
