import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSystemDb, Mentor } from '../models/system/index.js';

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the artifact JSON
const JSON_PATH = path.resolve('C:/Users/JoseO/.gemini/antigravity/brain/2fe1b439-0206-4adb-ac5e-49158bfa81b9/sovereign_curriculum.json');

const injectData = async () => {
    try {
        console.log('--- Injecting Sovereignty Plan 2026 ---');

        // 1. Initialize DB (to ensure schema updates like startDate/endDate)
        await initSystemDb();

        // 2. Read JSON
        const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
        const plan = JSON.parse(rawData);

        console.log(`> Loaded Plan: "${plan.meta.title}"`);

        // 3. Process Campaigns to Calculate Dates
        const year = 2026;
        const mentorsToInsert = [];

        for (const campaign of plan.campaigns) {
            const { months, mentors } = campaign;
            if (!mentors || mentors.length === 0) continue;

            // Calculate duration for each mentor within the campaign
            // Campaign duration in milliseconds
            // Simply: Assign equal split of the campaign months to the mentors.

            // Start of Campaign
            const startMonth = months[0];
            const endMonth = months[months.length - 1]; // Inclusive

            const campaignStart = new Date(year, startMonth, 1);
            const campaignEnd = new Date(year, endMonth + 1, 0); // Last day of end month

            const totalDays = (campaignEnd - campaignStart) / (1000 * 60 * 60 * 24);
            const daysPerMentor = totalDays / mentors.length;

            console.log(`> Processing Campaign: ${campaign.title} (${mentors.length} mentors, ~${Math.round(daysPerMentor)} days each)`);

            let currentStart = new Date(campaignStart);

            for (const mentorId of mentors) {
                // Find mentor details
                const mentorDetails = plan.mentors.find(m => m.id === mentorId);
                if (!mentorDetails) {
                    console.warn(`! Mentor ${mentorId} not found in definitions.`);
                    continue;
                }

                const currentEnd = new Date(currentStart.getTime() + (daysPerMentor * 24 * 60 * 60 * 1000));

                // Create Mentor Object for DB
                // Note: ID in DB is string. We use the JSON ID.
                mentorsToInsert.push({
                    id: mentorId + '-' + campaign.id, // Unique ID per assignment (mentor could appear in multiple campaigns)
                    name: mentorDetails.name,
                    role: mentorDetails.role,
                    image: mentorDetails.image,
                    quotes: mentorDetails.quotes,
                    startDate: new Date(currentStart), // Copy
                    endDate: new Date(currentEnd)
                });

                // Move start pointer
                currentStart = new Date(currentEnd);
            }
        }

        // 4. Wipe and Insert Mentors
        console.log('> Cleaning old data...');
        await Mentor.destroy({ where: {}, truncate: true });

        // Also wipe Curriculum
        const { CurriculumModule, Mission } = await import('../models/system/index.js');
        await Mission.destroy({ where: {}, truncate: true });
        await CurriculumModule.destroy({ where: {}, truncate: true });

        console.log(`> Inserting ${mentorsToInsert.length} mentor assignments...`);
        await Mentor.bulkCreate(mentorsToInsert);

        // 5. Inject Curriculum
        console.log('> Processing Curriculum Modules...');
        const modulesToInsert = [];
        const missionsToInsert = [];

        let orderCounter = 1;
        for (const mod of plan.modules) {
            modulesToInsert.push({
                id: mod.id,
                title: mod.title,
                description: mod.description,
                order: orderCounter++
            });

            // Convert Topics to Missions (1 Topic = 1 Weekly Mission for simplicity, or just a list)
            // The user asked for "Misiones semanales". Let's assign them week numbers.
            let week = 1;
            for (const topic of mod.topics) {
                missionsToInsert.push({
                    text: topic,
                    week: week++,
                    moduleId: mod.id,
                    isCompleted: false
                });
            }
        }

        await CurriculumModule.bulkCreate(modulesToInsert);
        await Mission.bulkCreate(missionsToInsert);
        console.log(`> Inserted ${modulesToInsert.length} Modules and ${missionsToInsert.length} Missions.`);

        console.log('--- Injection Complete: SUCCESS ---');
        process.exit(0);

    } catch (error) {
        console.error('Injection Failed:', error);
        process.exit(1);
    }
};

injectData();
