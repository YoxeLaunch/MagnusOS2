import { initSystemDb, Mentor } from '../models/system/index.js';
import { Op } from 'sequelize';

const consolidateCreator = async () => {
    await initSystemDb();
    console.log('--- Consolidating Creator entries ---');

    // 1. Find "El Creador" (the one we injected)
    const creator = await Mentor.findOne({ where: { name: 'El Creador' } });

    // 2. Find any "Jose Osvaldo" duplicates
    const duplicates = await Mentor.findAll({
        where: {
            name: { [Op.like]: '%Jose Osvaldo%' },
            id: { [Op.ne]: creator ? creator.id : 'ignore' }
        }
    });

    if (creator) {
        console.log('Updating "El Creador" to "Jose Osvaldo De la Cruz"...');
        await creator.update({
            name: 'Jose Osvaldo De la Cruz',
            role: 'Fundador & Arquitecto del Sistema', // Combined role
            // Keep the custom ID 'the-creator-2025' or 'creator'
        });
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates. Removing...`);
        for (const dup of duplicates) {
            console.log(`Deleting duplicate: ${dup.name} (${dup.id})`);
            await dup.destroy();
        }
    }

    console.log('Consolidation complete.');
};

consolidateCreator();
