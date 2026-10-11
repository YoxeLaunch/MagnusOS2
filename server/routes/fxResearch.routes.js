import { Router } from 'express';
import {
    getResearchModels,
    getSeriesStats,
    getResearchExperiments,
    getBacktestDetail,
    runResearchBenchmark
} from '../controllers/fxResearchController.js';
import { requireAuthenticated, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoints de solo lectura para el Laboratorio Cuantitativo de Nivel 3
router.get('/models', getResearchModels);
router.get('/series/stats', getSeriesStats);
router.get('/experiments', getResearchExperiments);
router.get('/backtests/:id', getBacktestDetail);
router.get('/forecasts/:id', getBacktestDetail);

// Ejecución controlada bajo demanda (restringida a administradores autenticados)
router.post('/run', requireAuthenticated, requireAdmin, runResearchBenchmark);

export default router;
