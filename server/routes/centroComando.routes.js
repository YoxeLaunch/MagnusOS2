import { Router } from 'express';
import * as centroComandoController from '../controllers/centroComandoController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware if needed - assuming it uses the same as finanza
router.use(verifyJWT);

router.get('/anual', centroComandoController.getAnual);
router.get('/mensual', centroComandoController.getMensual);
router.get('/ciclos', centroComandoController.getCiclos);

export default router;
