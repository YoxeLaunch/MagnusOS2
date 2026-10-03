/**
 * ============================================================================
 * ENERGÍA RD // ROUTES
 * Enrutamiento API para combustibles y mercado energético
 * ============================================================================
 */

import { Router } from 'express';
import {
    getEnergySummary,
    getFuelsList,
    getFuelDetail,
    getFuelHistory,
    getPolicyHistory,
    syncEnergyData
} from '../controllers/energyController.js';

const router = Router();

router.get('/', getEnergySummary);
router.get('/fuels', getFuelsList);
router.get('/fuels/:fuelId', getFuelDetail);
router.get('/fuels/:fuelId/history', getFuelHistory);
router.get('/policy', getPolicyHistory);
router.post('/sync', syncEnergyData);

export default router;
