import { initSystemDb, Mentor } from '../models/system/index.js';

const checkImages = async () => {
    await initSystemDb();
    const mentors = await Mentor.findAll();
    console.log('--- Mentor Image Paths in DB ---');
    mentors.forEach(m => {
        console.log(`${m.name}: '${m.image}'`);
    });
};

checkImages();
