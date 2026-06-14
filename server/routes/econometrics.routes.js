import express from 'express';
import * as econometricsController from '../controllers/econometricsController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// All econometrics routes protected by JWT
router.use(verifyJWT);

// Dashboard summary (MPC + forecast + anomaly count)
router.get('/dashboard', econometricsController.getDashboard);

// 30-day liquidity forecast with confidence bands
router.get('/forecast', econometricsController.getForecast);

// Anomaly management
router.get('/anomalies', econometricsController.getAnomalies);
router.post('/anomalies/:id/justify', econometricsController.justifyAnomaly);
router.post('/detect-anomalies', econometricsController.runDetection);

export default router;
