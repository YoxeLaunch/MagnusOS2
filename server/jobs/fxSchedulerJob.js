/**
 * ============================================================================
 * PROVIDENCE FX SERVICE // SCHEDULER JOB
 * Automated rate synchronization aligned with Dominican banking business hours
 * Timezone: America/Santo_Domingo
 * Active Window: Monday - Friday 07:00–20:00 (hourly) + 23:00 (late closing)
 * ============================================================================
 */

import cron from 'node-cron';
import { fxService } from '../services/fx/fxService.js';

export const scheduleFxJob = () => {
    // Configuración desde variables de entorno
    const activeStartHour = parseInt(process.env.FX_ACTIVE_START_HOUR || '7', 10);
    const activeEndHour = parseInt(process.env.FX_ACTIVE_END_HOUR || '20', 10);
    const lateHour = parseInt(process.env.FX_LATE_REFRESH_HOUR || '23', 10);

    // Cron: Minuto 0 de cada hora entre activeStartHour y activeEndHour, de Lunes a Viernes (1-5)
    // Ejemplo: 0 7-20 * * 1-5
    const hourlyCron = `0 ${activeStartHour}-${activeEndHour} * * 1-5`;

    cron.schedule(hourlyCron, async () => {
        console.log(`[FX_SCHEDULER] Disparando actualización programada USD/DOP y EUR/DOP en horario bancario RD (${new Date().toLocaleTimeString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await Promise.allSettled([
                fxService.getRates('USD/DOP', { forceRefresh: true }),
                fxService.getRates('EUR/DOP', { forceRefresh: true })
            ]);
        } catch (error) {
            console.error('[FX_SCHEDULER] Error en refresco programado horario:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    // Cron: Minuto 0 a las 23:00 de Lunes a Viernes para fijar el cierre del día
    const lateClosingCron = `0 ${lateHour} * * 1-5`;

    cron.schedule(lateClosingCron, async () => {
        console.log(`[FX_SCHEDULER] Disparando consolidación de cierre diario RD (${lateHour}:00 Santo Domingo)...`);
        try {
            await Promise.allSettled([
                fxService.getRates('USD/DOP', { forceRefresh: true }),
                fxService.getRates('EUR/DOP', { forceRefresh: true })
            ]);
        } catch (error) {
            console.error('[FX_SCHEDULER] Error en refresco nocturno:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    console.log(`[FX_SCHEDULER] Planificador FX activo: Lun-Vie ${activeStartHour}:00-${activeEndHour}:00 cada 60m + ${lateHour}:00 (America/Santo_Domingo).`);
};
