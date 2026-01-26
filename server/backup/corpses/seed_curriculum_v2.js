import { initSystemDb, CurriculumModule, Mission } from '../models/system/index.js';

// Define the correct data structure
const CORRECT_CURRICULUM = [
    {
        id: 'm1',
        order: 1,
        month: 'ENERO',
        title: 'Psicología del Logro',
        mentor: 'Brian Tracy',
        description: 'Establece los cimientos mentales para el éxito absoluto.',
        missions: [
            { week: 1, text: 'Definir 10 metas anuales (Método SMART)' },
            { week: 2, text: 'Dieta Mental: 0 Quejas por 7 días' },
            { week: 3, text: 'Leer Caps 1-3 de Maximum Achievement' },
            { week: 4, text: 'Crear Tablero de Visión 2026' }
        ]
    },
    {
        id: 'm2',
        order: 2,
        month: 'FEBRERO',
        title: 'Gestión del Tiempo',
        mentor: 'Irene Albacete',
        description: 'Domina el recurso más escaso: tu tiempo.',
        missions: [
            { week: 5, text: 'Auditoría de Tiempo (Registro de 3 días)' },
            { week: 6, text: 'Planificación Nocturna Diaria' },
            { week: 7, text: 'Aplicar Ley de Pareto (80/20)' },
            { week: 8, text: 'Eliminar 3 Ladrones de Tiempo' }
        ]
    },
    {
        id: 'm3',
        order: 3,
        month: 'MARZO',
        title: '48 Leyes del Poder',
        mentor: 'Robert Greene',
        description: 'Navega las dinámicas de poder en cualquier entorno.',
        missions: [
            { week: 9, text: 'Observación: Identificar juegos de poder' },
            { week: 10, text: 'Ley 3: Oculta tus intenciones' },
            { week: 11, text: 'Ley 4: Di menos de lo necesario' },
            { week: 12, text: 'Análisis de Entorno Laboral' }
        ]
    }
];

const seedCurriculum = async () => {
    try {
        console.log('Initializing DB...');
        await initSystemDb();
        await sequelizeSystem.sync({ force: true });
        console.log('DB Initialized & Forced.');

        console.log('Clearing old data...');
        // Use individual destroys to avoid FK issues if possible, or force.
        // We will try deleting Missions first (Child) then Modules (Parent).
        await Mission.destroy({ where: {} });
        await CurriculumModule.destroy({ where: {} });

        console.log('Seeding new data...');
        for (const mod of CORRECT_CURRICULUM) {
            console.log(`Creating Module: ${mod.title}`);
            const created = await CurriculumModule.create({
                id: mod.id,
                title: mod.title,
                description: mod.description,
                order: mod.order
            });

            for (const mis of mod.missions) {
                await Mission.create({
                    text: mis.text,
                    week: mis.week,
                    moduleId: created.id,
                    isCompleted: false // RESET
                });
            }
        }
        console.log('Seed Complete. Success.');
    } catch (e) {
        console.error('Seed Failed:', e);
    }
};

seedCurriculum();
