import { Router } from 'express';
import authRoutes from './auth.routes.js';
import finanzaRoutes from './finanza.routes.js';
import magnusRoutes from './magnus.routes.js';
import systemRoutes from './system.routes.js';
import healthRoutes from './health.routes.js';
import auditorRoutes from './auditor.routes.js';
import telegramRoutes from './telegram.routes.js';

const router = Router();

router.use('/', authRoutes);
router.use('/', finanzaRoutes);
router.use('/', magnusRoutes);
router.use('/', systemRoutes);
router.use('/', healthRoutes);
router.use('/auditor', auditorRoutes);
router.use('/telegram', telegramRoutes);

export default router;
