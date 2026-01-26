import { initSystemDb, Mentor } from '../models/system/index.js';

const injectCreator = async () => {
    try {
        await initSystemDb();
        console.log('--- Injecting The Creator (Dec 2025) ---');

        // Define The Creator
        const creator = {
            id: 'the-creator-2025',
            name: 'El Creador',
            role: 'Arquitecto del Sistema', // "Cargo" requested by user
            image: '/images/mentors/creator.jpg', // Placeholder, will need user to confirm image
            quotes: [
                "La soberanía se forja en el silencio antes de la batalla.",
                "Estamos en los últimos días de la vieja era. Prepárate."
            ],
            startDate: new Date('2025-12-01T00:00:00'),
            endDate: new Date('2025-12-31T23:59:59')
        };

        // Check if exists
        const existing = await Mentor.findByPk(creator.id);
        if (existing) {
            await existing.update(creator);
            console.log('Updated existing Creator.');
        } else {
            await Mentor.create(creator);
            console.log('Created new Creator.');
        }

        console.log('Success.');

    } catch (error) {
        console.error('Error:', error);
    }
};

injectCreator();
