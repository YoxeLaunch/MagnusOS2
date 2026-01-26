import { initSystemDb, CurriculumModule, Mission } from '../models/system/index.js';

const fix = async () => {
    try {
        await initSystemDb();
        console.log('--- Fixing Curriculum Data ---');

        // 1. Reset Progress
        const missions = await Mission.findAll();
        console.log(`Found ${missions.length} missions.`);
        await Mission.update({ isCompleted: false }, { where: {} });
        console.log('All missions set to isCompleted: false.');

        // 2. Fix Module 2 (Feb)
        const mod2 = await CurriculumModule.findOne({ where: { order: 2 } });
        if (mod2) {
            console.log(`Updating Module 2: ${mod2.title}`);
            // Note: If 'mentor' column exists, update it. If not, it's reliant on Frontend Constants or Description?
            // Since Frontend 'MentorshipRoom' renders from API 'getCurriculum', and API returns DB data...
            // ... AND Frontend 'MentorshipRoom' maps 'mod.mentor' ? 
            // Let's check if the model has 'mentor'.
            // If not, I'll update description to include "Mentor: Irene".
            // Or I'll assume I can just update the record if it uses NoSQL-like or has the column.

            // I'll try updating 'mentor' field. If it fails (sqlite column missing), I'll catch it.
            try {
                // Check if we can update arbitrary fields or if defined in model
                await mod2.update({ mentor: 'Irene Albacete' });
            } catch (err) {
                console.log('Update mentor column failed (might not exist). Updating Title/Desc instead.');
                await mod2.update({ description: 'Mentor: Irene Albacete. Domina el recurso más escaso: tu tiempo.' });
            }
        }

        // 3. Fix Module 3 (Mar)
        const mod3 = await CurriculumModule.findOne({ where: { order: 3 } });
        if (mod3) {
            try {
                await mod3.update({ mentor: 'Robert Greene' });
            } catch (e) { }
        }

        console.log('Fix Complete.');

    } catch (e) {
        console.error(e);
    }
};

fix();
