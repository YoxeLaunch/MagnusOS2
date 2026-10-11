import { Router } from 'express';
import {
    getResearchModels,
    getSeriesStats,
    getResearchExperiments,
    getBacktestDetail,
    getForwardForecast,
    getRiskAnalytics,
    getDataQualityMetrics,
    runResearchBenchmark
} from '../controllers/fxResearchController.js';
import { optionalJWT, requireAuthenticated, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Endpoints de solo lectura para el Laboratorio Cuantitativo de Nivel 3 (optionalJWT para contexto de usuario)
router.get('/models', optionalJWT, getResearchModels);
router.get('/series/stats', optionalJWT, getSeriesStats);
router.get('/experiments', optionalJWT, getResearchExperiments);
router.get('/backtests/:id', optionalJWT, getBacktestDetail);
router.get('/forecasts/:id', optionalJWT, getForwardForecast);
router.get('/risk/volatility', optionalJWT, getRiskAnalytics);
router.get('/quality', optionalJWT, getDataQualityMetrics);

// Ejecución controlada bajo demanda (restringida a administradores autenticados)
router.post('/run', requireAuthenticated, requireAdmin, runResearchBenchmark);
router.post('/backtests/run', requireAuthenticated, requireAdmin, runResearchBenchmark);

export default router;
