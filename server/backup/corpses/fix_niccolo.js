import { initSystemDb, Mentor } from '../models/system/index.js';
import { Op } from 'sequelize';

const fixNiccolo = async () => {
    await initSystemDb();
    const m = await Mentor.findOne({
        where: { name: { [Op.like]: '%Maquiavelo%' } }
    });

    if (m) {
        console.log(`Updating ${m.name} from ${m.image} to /images/mentors/niccolo.jpg`);
        await m.update({ image: '/images/mentors/niccolo.jpg' });
    }
};

fixNiccolo();
