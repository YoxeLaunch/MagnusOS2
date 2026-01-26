import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updates = [
    {
        "id": "11",
        "date": "2025-12-25",
        "title": "Historial de Novedades Activo",
        "description": "Implementación del widget de notificaciones para visualizar actualizaciones del sistema en el Home.",
        "type": "feature"
    },
    {
        "id": "10",
        "date": "2025-12-25",
        "title": "Animación Landing Page",
        "description": "Nueva animación cinemática tipo 'El Redentor' con exoesqueleto robótico al hacer scroll.",
        "type": "feature"
    },
    {
        "id": "9",
        "date": "2025-12-25",
        "title": "Lanzador Automático",
        "description": "Creación del script 'INICIAR_SISTEMA.bat' para arranque simultáneo de servidor y cliente.",
        "type": "improvement"
    },
    {
        "id": "8",
        "date": "2025-12-24",
        "title": "Insignia VIP",
        "description": "Distintivo visual para usuarios destacados en la sala de mentorías.",
        "type": "feature"
    },
    {
        "id": "7",
        "date": "2025-12-24",
        "title": "Transiciones UI",
        "description": "Mejora global de animaciones y suavizado de transiciones entre pantallas.",
        "type": "improvement"
    },
    {
        "id": "6",
        "date": "2025-12-24",
        "title": "Corrección Panel Admin",
        "description": "Solución de errores de sintaxis y renderizado en el panel de administración.",
        "type": "bugfix"
    },
    {
        "id": "5",
        "date": "2025-12-24",
        "title": "Citas Rotativas",
        "description": "Sistema de rotación automática para frases célebres de mentores.",
        "type": "feature"
    },
    {
        "id": "4",
        "date": "2025-12-24",
        "title": "Diseño Mentores",
        "description": "Rediseño de tarjetas de mentores con efectos de claridad al pasar el mouse.",
        "type": "improvement"
    },
    {
        "id": "3",
        "date": "2025-12-23",
        "title": "Depuración Sala Mentoría",
        "description": "Corrección de cierre inesperado (crash) al cargar imágenes de mentores.",
        "type": "bugfix"
    },
    {
        "id": "2",
        "date": "2025-12-23",
        "title": "Sistema Mentor del Mes",
        "description": "Funcionalidad para destacar mentores específicos según el mes actual.",
        "type": "feature"
    },
    {
        "id": "1",
        "date": "2025-12-21",
        "title": "Cronología Financiera",
        "description": "Inicio del registro histórico de finanzas y gráficas de proyección.",
        "type": "feature"
    }
];

fs.writeFileSync(path.join(__dirname, 'updates.json'), JSON.stringify(updates, null, 2), 'utf8');
console.log('updates.json written successfully with UTF-8 encoding');
