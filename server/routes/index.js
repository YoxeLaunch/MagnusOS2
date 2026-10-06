import { Router } from 'express';
import authRoutes from './auth.routes.js';
import finanzaRoutes from './finanza.routes.js';
import magnusRoutes from './magnus.routes.js';
import systemRoutes from './system.routes.js';
import healthRoutes from './health.routes.js';
import auditorRoutes from './auditor.routes.js';
import telegramRoutes from './telegram.routes.js';
import aiRoutes from './ai.routes.js';
import centroComandoRoutes from './centroComando.routes.js';
import econometricsRoutes from './econometrics.routes.js';
import marketRoutes from './market.routes.js';
import { macroRoutes, notificationRoutes } from './macro.routes.js';
import energyRoutes from './energy.routes.js';
import bankingRoutes from './sbBanking.routes.js';

const router = Router();

router.use('/markets/banking', bankingRoutes);
router.use('/markets/energy-rd', energyRoutes);
router.use('/markets/energy', energyRoutes);
router.use('/markets/macro', macroRoutes);
router.use('/notifications', notificationRoutes);
router.use('/markets', marketRoutes);
router.use('/telemetry/markets', marketRoutes);
router.use('/health', healthRoutes);
router.use('/', healthRoutes);
router.use('/', authRoutes);
router.use('/', finanzaRoutes);
router.use('/', magnusRoutes);
router.use('/', systemRoutes);
router.use('/auditor', auditorRoutes);
router.use('/telegram', telegramRoutes);
router.use('/ai', aiRoutes);
router.use('/centro-comando', centroComandoRoutes);
router.use('/econometrics', econometricsRoutes);

export default router;
