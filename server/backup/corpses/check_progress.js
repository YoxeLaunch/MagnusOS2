import { initSystemDb, Mission } from '../models/system/index.js';

const check = async () => {
    await initSystemDb();
    const missions = await Mission.findAll();
    console.log(`Total Missions: ${missions.length}`);
    const completed = missions.filter(m => m.isCompleted);
    console.log(`Completed Missions: ${completed.length}`);
    completed.forEach(m => console.log(` - [COMPLETED] ${m.text}`));
};

check();
