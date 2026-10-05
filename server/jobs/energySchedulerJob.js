/**
 * ============================================================================
 * ENERGÍA RD // INTELLIGENT SCHEDULER JOB
 * Sincronización programada adaptada al ciclo de publicación semanal del MICM
 * Timezone: America/Santo_Domingo
 * ============================================================================
 */

import cron from 'node-cron';
import { energyService } from '../services/energy/energyService.js';
import { jobObservability } from '../services/jobObservabilityService.js';

export const scheduleEnergyJob = () => {
    const isEnabled = process.env.ENERGY_SCHEDULER_ENABLED !== 'false';
    if (!isEnabled) {
        console.log('[ENERGY_SCHEDULER] Deshabilitado por configuración (ENERGY_SCHEDULER_ENABLED=false).');
        return;
    }

    // Cron 1: Ventana crítica de los Viernes (11:00 AM a 5:00 PM, cada 30 minutos)
    // El MICM tradicionalmente emite las resoluciones los viernes en horas de la tarde.
    const fridayCron = '*/30 11-17 * * 5';

    cron.schedule(fridayCron, async () => {
        console.log(`[ENERGY_SCHEDULER] Chequeo de ventana de resolución MICM (${new Date().toLocaleTimeString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await jobObservability.executeMonitoredJob('energy_weekly_sync', async () => {
                const summary = await energyService.getEnergySummary({ forceRefresh: true });
                return {
                    summary: `MICM energy resolution checked (${summary?.fuels?.length || 0} fuels)`,
                    itemsProcessed: summary?.fuels?.length || 0,
                    failuresCount: 0
                };
            });
        } catch (error) {
            console.error('[ENERGY_SCHEDULER] Error en chequeo de viernes:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    // Cron 2: Verificación de sábado (08:00 AM) al entrar en vigencia oficial los nuevos precios
    const saturdayCron = '0 8 * * 6';

    cron.schedule(saturdayCron, async () => {
        console.log(`[ENERGY_SCHEDULER] Verificación de vigencia sabatina MICM (${new Date().toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' })})...`);
        try {
            await energyService.getEnergySummary({ forceRefresh: true });
        } catch (error) {
            console.error('[ENERGY_SCHEDULER] Error en verificación de sábado:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    // Cron 3: Chequeo de cortesía de baja frecuencia Lunes y Jueves (12:00 PM)
    const midWeekCron = '0 12 * * 1,4';

    cron.schedule(midWeekCron, async () => {
        try {
            await energyService.getEnergySummary({ forceRefresh: false });
        } catch (error) {
            console.error('[ENERGY_SCHEDULER] Error en chequeo semanal:', error.message);
        }
    }, {
        timezone: 'America/Santo_Domingo'
    });

    console.log('[ENERGY_SCHEDULER] Planificador Energía RD activo: Vie 11-17h (c/30m), Sáb 08:00h y Lun/Jue 12:00h (America/Santo_Domingo).');
};
