import { initSystemDb, Mentor } from '../models/system/index.js';

const inspectIrene = async () => {
    await initSystemDb();
    const irene = await Mentor.findOne({ where: { name: 'Irene Albacete' } });
    if (irene) {
        console.log('--- IRENE RECORD ---');
        console.log('Name:', irene.name);
        console.log('Image:', irene.image);
        console.log('StartDate:', irene.startDate);
        console.log('EndDate:', irene.endDate);
    } else {
        console.log('Irene not found by exact name.');
        const all = await Mentor.findAll();
        all.forEach(m => {
            if (m.name.includes('Irene')) {
                console.log('Found partial:', m.name, m.image);
            }
        });
    }
};

inspectIrene();
