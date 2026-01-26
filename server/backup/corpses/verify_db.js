import { initSystemDb, CurriculumModule } from '../models/system/index.js';

const check = async () => {
    await initSystemDb();
    const modules = await CurriculumModule.findAll({ order: [['order', 'ASC']] });
    modules.forEach(m => {
        console.log(`Month: ${m.month} | Mentor: ${m.mentor} | Title: ${m.title}`);
    });
};

check();
