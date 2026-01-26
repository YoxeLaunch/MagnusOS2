import { SystemUpdate, initSystemDb } from '../models/system/index.js';

const run = async () => {
    try {
        await initSystemDb();

        await SystemUpdate.create({
            title: 'Magnus Refactor v2.1',
            description: 'Implementación mayor completada:\n\n✨ TypeScript Estricto\n🌐 Internacionalización (Es/En)\n🚀 Carga Diferida y Rendimiento\n🧪 Pruebas Unitarias\n🔄 CI/CD Automatizado',
            type: 'feature',
            version: '2.1.0',
            date: new Date(),
            isPublished: true
        });

        console.log('Update registered successfully!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
