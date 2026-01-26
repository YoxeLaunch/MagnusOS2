import { initSystemDb, Mentor } from '../models/system/index.js';

const listSchedule = async () => {
    await initSystemDb();
    const mentors = await Mentor.findAll({
        order: [['startDate', 'ASC']]
    });

    console.log('\n=== CALENDARIO ACTUAL DE MENTORES ===');
    mentors.forEach(m => {
        const start = m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : 'N/A';
        const end = m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : 'N/A';
        console.log(`[${start} -> ${end}] ${m.name}`);
    });
    console.log('=====================================\n');
};

listSchedule();
