import { initSystemDb, Mentor } from '../models/system/index.js';
import { Op } from 'sequelize';

const correctMentors = async () => {
    await initSystemDb();
    console.log('--- Correcting Mentor Data (Images & Dates) ---');

    const mentors = await Mentor.findAll();

    for (const m of mentors) {
        let updates = {};
        const name = m.name.toLowerCase();

        // 1. Image Logic (Robust Partial Matching)
        if (name.includes('irene')) updates.image = '/images/mentors/irene.jpg';
        else if (name.includes('pilar')) updates.image = '/images/mentors/pilar.jpg';
        else if (name.includes('melinka')) updates.image = '/images/mentors/melinka.jpg';
        else if (name.includes('robert')) updates.image = '/images/mentors/robert.jpg';
        else if (name.includes('victoria')) updates.image = '/images/mentors/victoria.jpg';
        else if (name.includes('brian')) updates.image = '/images/mentors/brian.jpg';
        else if (name.includes('jose') || name.includes('creador')) updates.image = '/images/mentors/creator.jpg';
        // Note: Niccolo might not have an image yet

        // 2. Date Logic (Align to 1st of Month if needed)
        // Brian: Jan
        if (name.includes('brian')) {
            updates.startDate = '2026-01-01';
            updates.endDate = '2026-01-31';
        }
        // Irene: Feb
        else if (name.includes('irene')) {
            updates.startDate = '2026-02-01';
            updates.endDate = '2026-02-28';
        }
        // Niccolo: March (Example - aligning to monthly blocks as per common request, 
        // though original JSON had Q1 splits. User said "cada mentor empieza el 1ro")
        // Let's stick to the JSON order but ensure 1st -> End of Month.
        // Wait, the JSON had them spanning 1.5 months? 
        // User request: "recordar que cada mentor empieza el 1ro de cada mes"
        // This implies 1 Month per Mentor? Or simply that they start on the 1st?
        // Let's force them to start on the 1st.

        /* 
           Schedule:
           Jan: Brian
           Feb: Irene
           Mar: Niccolo (Assuming)
           Apr: Robert
           May: Pilar
           Jun: Melinka
           Jul: Victoria
           
           Wait, let's look at the original JSON order:
           Q1: Irene, Brian (User wanted Brian First) -> So Jan=Brian, Feb=Irene?
           Q2: Niccolo, Robert, Pilar
           Q3: Melinka
           
           Let's propose:
           Jan: Brian
           Feb: Irene
           Mar: Niccolo
           Apr: Robert
           May: Pilar
           Jun: Melinka
           Jul: Victoria
        */

        // Applying this strict monthly schedule:
        if (name.includes('brian')) { updates.startDate = '2026-01-01'; updates.endDate = '2026-01-31'; }
        else if (name.includes('irene')) { updates.startDate = '2026-02-01'; updates.endDate = '2026-02-28'; }
        else if (name.includes('maquiavelo') || name.includes('niccolo')) { updates.startDate = '2026-03-01'; updates.endDate = '2026-03-31'; }
        else if (name.includes('robert')) { updates.startDate = '2026-04-01'; updates.endDate = '2026-04-30'; }
        else if (name.includes('pilar')) { updates.startDate = '2026-05-01'; updates.endDate = '2026-05-31'; }
        else if (name.includes('melinka')) { updates.startDate = '2026-06-01'; updates.endDate = '2026-06-30'; }
        else if (name.includes('victoria')) { updates.startDate = '2026-07-01'; updates.endDate = '2026-07-31'; }
        else if (name.includes('jose') || name.includes('creador')) {
            updates.startDate = '2025-12-01';
            updates.endDate = '2025-12-31';
        }

        if (Object.keys(updates).length > 0) {
            console.log(`Updating ${m.name}:`, updates);
            await m.update(updates);
        }
    }
    console.log('Done.');
};

correctMentors();
