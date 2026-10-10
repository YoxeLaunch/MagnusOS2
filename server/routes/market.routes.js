import { Router } from 'express';
import {
    getMarkets,
    getMarketChart,
    getFxUsdDop,
    getFxEurDop,
    getFxRatesByPair,
    getFxHistory,
    getTasaRealEvaluation,
    refreshFxRates,
    handleSyncRates
} from '../controllers/marketController.js';
import { requireAuthenticated, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoint público para telemetría general de mercados financieros
router.get('/', getMarkets);
router.get('/telemetry', getMarkets);
router.get('/chart/:symbol', getMarketChart);

// Endpoint explícito para sincronizar tasas en la base de datos (comando POST)
router.post('/sync-rates', requireAuthenticated, handleSyncRates);

// Endpoints de Providence FX (Mercado Cambiario Dominicano)
router.get('/fx/usd-dop', getFxUsdDop);
router.get('/fx/eur-dop', getFxEurDop);
router.get('/fx/pair/:pair', getFxRatesByPair);
router.get('/fx/history/:institution', getFxHistory);
router.get('/fx/evaluation/tasareal', getTasaRealEvaluation);
// A forced refresh consumes external-provider capacity; restrict it server-side.
router.post('/fx/refresh', requireAuthenticated, requireAdmin, refreshFxRates);

export default router;
