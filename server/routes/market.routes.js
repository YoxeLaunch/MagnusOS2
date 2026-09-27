import { Router } from 'express';
import { getMarkets, getMarketChart } from '../controllers/marketController.js';

const router = Router();

// Endpoint público para telemetría de mercados financieros
router.get('/', getMarkets);
router.get('/telemetry', getMarkets);
router.get('/chart/:symbol', getMarketChart);

export default router;

