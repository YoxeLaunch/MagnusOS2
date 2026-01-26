import { initSystemDb, Mentor } from '../models/system/index.js';

const checkImages = async () => {
    await initSystemDb();
    const mentors = await Mentor.findAll();
    console.log('\n=== RUTAS DE IMAGENES ACTUALES ===');
    mentors.forEach(m => {
        console.log(`[${m.name}] (ID: ${m.id}) -> ${m.image}`);
    });
    console.log('==================================\n');
};

checkImages();
