import { Router } from 'express';
import {
    getMarkets,
    getMarketChart,
    getFxUsdDop,
    getFxHistory,
    getTasaRealEvaluation,
    refreshFxRates
} from '../controllers/marketController.js';
import { optionalJWT } from '../middleware/auth.js';

const router = Router();

// Endpoint público para telemetría general de mercados financieros
router.get('/', getMarkets);
router.get('/telemetry', getMarkets);
router.get('/chart/:symbol', getMarketChart);

// Endpoints de Providence FX (Mercado Cambiario Dominicano)
router.get('/fx/usd-dop', getFxUsdDop);
router.get('/fx/history/:institution', getFxHistory);
router.get('/fx/evaluation/tasareal', getTasaRealEvaluation);
router.post('/fx/refresh', optionalJWT, refreshFxRates);

export default router;
