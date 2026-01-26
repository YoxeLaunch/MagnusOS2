import { initSystemDb, Mentor } from '../models/system/index.js';
import { Op } from 'sequelize';

const checkNiccolo = async () => {
    await initSystemDb();
    const m = await Mentor.findOne({
        where: {
            name: { [Op.like]: '%Maquiavelo%' }
        }
    });

    if (m) {
        console.log(`[${m.name}] Image Path: ${m.image}`);
    } else {
        console.log('Niccolo not found.');
    }
};

checkNiccolo();
