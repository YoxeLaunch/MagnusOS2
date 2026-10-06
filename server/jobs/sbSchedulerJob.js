/**
 * ============================================================================
 * SUPERINTENDENCIA DE BANCOS (SB) // INTELLIGENT SCHEDULER JOB
 * Sincronización mensual adaptada al calendario de publicación de la SB RD
 * Timezone: America/Santo_Domingo (Día 16 a las 03:00 AM)
 * ============================================================================
 */

import cron from 'node-cron';
import { sbStatisticsService } from '../services/sb/sbStatisticsService.js';
import { jobObservability } from '../services/jobObservabilityService.js';

export const scheduleSbJob = () => {
    const isEnabled = process.env.SB_ENABLED !== 'false';
    if (!isEnabled) {
        console.log('[SB_SCHEDULER] Deshabilitado por configuración (SB_ENABLED=false).');
        return;
    }

    // Cron mensual: Día 16 de cada mes a las 03:00 AM (Zona horaria Dominicana)
    // Los cierres bancarios del mes anterior suelen publicarse entre el día 10 y el 15.
    const monthlyCron = '0 3 16 * *';

    cron.schedule(monthlyCron, async () => {
        console.log(`[SB_SCHEDULER] Ejecutando sincronización mensual automática SB (${new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await jobObservability.executeMonitoredJob('sb_statistics_sync', async () => {
                const result = await sbStatisticsService.syncLatestSbPeriod();
                return {
                    summary: `SB Monthly Sync: ${result.action} - ${result.message}`,
                    itemsProcessed: result.syncResult?.totalReceived || 0,
                    failuresCount: result.syncResult?.totalFailed || 0,
                    metadata: {
                        lastDbPeriod: result.lastDbPeriod,
                        latestPublished: result.latestPublished
                    }
                };
            });
        } catch (error) {
            console.error('[SB_SCHEDULER] Error en sincronización mensual:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    // Verificación ligera no bloqueante al inicio del servidor (tras 15 segundos)
    setTimeout(async () => {
        try {
            console.log('[SB_SCHEDULER] Comprobando períodos pendientes de la Superintendencia de Bancos al inicio...');
            await jobObservability.executeMonitoredJob('sb_startup_check', async () => {
                const check = await sbStatisticsService.syncLatestSbPeriod();
                console.log(`[SB_SCHEDULER] Verificación inicial: ${check.message}`);
                return {
                    summary: check.message,
                    itemsProcessed: check.syncResult?.totalReceived || 0,
                    failuresCount: 0
                };
            });
        } catch (err) {
            console.warn('[SB_SCHEDULER] Aviso en chequeo inicial de la SB (servidor continúa operativo):', err.message);
        }
    }, 15000);

    console.log('[SB_SCHEDULER] Planificador SB activo: Día 16 de cada mes a las 03:00 AM (America/Santo_Domingo).');
};
