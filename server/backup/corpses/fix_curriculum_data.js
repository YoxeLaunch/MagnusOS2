import { initSystemDb, Mission, CurriculumModule } from '../models/system/index.js';

const fixData = async () => {
    await initSystemDb();
    console.log('--- Resetting Missions & Fixing Modules ---');

    // 1. Reset All Missions
    await Mission.update({ isCompleted: false }, { where: {} });
    console.log('All missions reset to incomplete.');

    // 2. Fix Module 2 (Feb) Mentor
    // We need to find the module "Gestión del Tiempo" (Feb)
    const mod2 = await CurriculumModule.findOne({ where: { order: 2 } });
    if (mod2) {
        // Assuming there is a field for mentor or we append it to description?
        // Let's check the model: title, description, order, image?
        // If the Frontend shows "Brian Tracy", it might be hardcoded in description?
        // OR there is a 'mentor' column?
        console.log('Module 2 found:', mod2.toJSON());

        // If the UI is showing "Brian Tracy", it's likely part of the "subtitle" or something.
        // I will assume for now I can update the description or title if that's where it is.
        // Wait, the screenshot shows "Brian Tracy" in small text below title.
        // If the model doesn't have 'mentor', maybe it's fetch from Mentor table by month?

        // If I can't see the column, I'll log it first.
    }
};

fixData();
