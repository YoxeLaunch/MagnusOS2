/**
 * currencyRateJob.js — Auto-actualización de tasas de cambio (USD/EUR -> DOP)
 *
 * Consulta una API pública gratuita (open.er-api.com) una vez al día y
 * guarda el resultado en CurrencyHistory, la misma tabla que usa la
 * actualización manual (updateRates en finanzaController.js). Si la
 * consulta falla (sin internet, API caída, etc.) se ignora en silencio
 * y el sistema sigue usando la última tasa guardada.
 */
import cron from 'node-cron';
import { CurrencyHistory } from '../models/index.js';

const RATES_API_URL = 'https://open.er-api.com/v6/latest/USD';

export const fetchAndStoreRates = async () => {
    try {
        const res = await fetch(RATES_API_URL);
        if (!res.ok) throw new Error(`Rates API responded ${res.status}`);
        const json = await res.json();

        const usdToDop = json?.rates?.DOP;
        const usdToEur = json?.rates?.EUR;
        if (!usdToDop) throw new Error('DOP rate missing from response');

        const today = new Date().toISOString().split('T')[0];
        await CurrencyHistory.create({ date: today, code: 'USD', rate: usdToDop });

        if (usdToEur) {
            // EUR rate expressed as DOP per EUR (via USD cross rate)
            const eurToDop = usdToDop / usdToEur;
            await CurrencyHistory.create({ date: today, code: 'EUR', rate: eurToDop });
        }

        console.log(`[currencyRateJob] Tasas actualizadas: USD=${usdToDop.toFixed(2)} DOP`);
    } catch (error) {
        console.error('[currencyRateJob] No se pudo actualizar la tasa automáticamente:', error.message);
    }
};

export const scheduleCurrencyRateJob = () => {
    // Todos los días a las 6:00 AM
    cron.schedule('0 6 * * *', fetchAndStoreRates);
};
