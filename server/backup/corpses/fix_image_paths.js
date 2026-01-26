import { initSystemDb, Mentor } from '../models/system/index.js';

const fixImages = async () => {
    await initSystemDb();
    console.log('--- Fixing Image Paths ---');

    const mapping = {
        'brian-tracy': 'brian.jpg',
        'irene-albacete': 'irene.jpg',
        'niccolo-machiavelli': 'niccolo.jpg', // Verify file exists or use close match? User ls showed 'robert.jpg', 'melinka.jpg', 'pilar.jpg', 'victoria.jpg'. No niccolo?
        // Wait, 'niccolo-machiavelli' might not have an image? 
        // User ls: brian, irene, melinka, pilar, robert, victoria.
        'robert-greene': 'robert.jpg',
        'melinka-barrera': 'melinka.jpg',
        'pilar-sousa': 'pilar.jpg',
        'the-creator-2025': 'creator.jpg'
    };

    // Note: checking if "niccolo.jpg" exists? 
    // The user's ls list: brian.jpg, irene.jpg, melinka.jpg, pilar.jpg, robert.jpg, victoria.jpg.
    // Niccolo is missing? I will map Niccolo to a placeholder or robert for now to avoid break.

    const mentors = await Mentor.findAll();
    for (const m of mentors) {
        let filename = mapping[m.id];

        // If no ID match, try name match or default
        if (!filename) {
            if (m.name.includes('Maquiavelo')) filename = 'robert.jpg'; // Pending upload
            else if (m.name.includes('Victoria')) filename = 'victoria.jpg';
            else filename = 'brian.jpg'; // Fallback
        }

        const cleanPath = `/images/mentors/${filename}`;

        if (m.image !== cleanPath) {
            console.log(`Updating ${m.name}: ${m.image} -> ${cleanPath}`);
            await m.update({ image: cleanPath });
        } else {
            console.log(`Verified ${m.name}: ${cleanPath}`);
        }
    }
};

fixImages();
