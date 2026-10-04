/**
 * ============================================================================
 * MACRO RD // INTELLIGENT SCHEDULER JOB
 * Sincronización programada adaptada al calendario de publicación del BCRD
 * Timezone: America/Santo_Domingo
 * ============================================================================
 */

import cron from 'node-cron';
import { macroService } from '../services/macro/macroService.js';
import { jobObservability } from '../services/jobObservabilityService.js';

export const scheduleMacroJob = () => {
    const isEnabled = process.env.MACRO_SCHEDULER_ENABLED !== 'false';
    if (!isEnabled) {
        console.log('[MACRO_SCHEDULER] Deshabilitado por configuración (MACRO_SCHEDULER_ENABLED=false).');
        return;
    }

    // Cron 1: Chequeo matutino (08:30) y vespertino (16:30) de Lunes a Viernes (horario laboral dominicano)
    const standardCron = '30 8,16 * * 1-5';

    cron.schedule(standardCron, async () => {
        console.log(`[MACRO_SCHEDULER] Ejecutando sincronización inteligente BCRD (${new Date().toLocaleTimeString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await jobObservability.executeMonitoredJob('macro_indicators_sync', async () => {
                const summary = await macroService.getMacroSummary({ forceRefresh: true });
                return {
                    summary: 'BCRD macro indicators synchronized',
                    itemsProcessed: summary?.indicators?.length || 0,
                    failuresCount: 0
                };
            });
        } catch (error) {
            console.error('[MACRO_SCHEDULER] Error en sincronización habitual:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    // Cron 2: Ventana crítica de Política Monetaria (Días 28-31 de cada mes a las 20:00)
    // El BCRD suele emitir sus comunicados de TPM al cierre de la última jornada del mes
    const tpmWindowCron = '0 20 28-31 * *';

    cron.schedule(tpmWindowCron, async () => {
        console.log(`[MACRO_SCHEDULER] Ejecutando monitoreo de ventana de decisión TPM BCRD (${new Date().toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await macroService.getMacroSummary({ forceRefresh: true });
        } catch (error) {
            console.error('[MACRO_SCHEDULER] Error en monitoreo TPM:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    console.log('[MACRO_SCHEDULER] Planificador Macro RD activo: Lun-Vie 08:30 y 16:30 + Ventana TPM fin de mes 20:00 (America/Santo_Domingo).');
};
