import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { authLimiter } from '../middleware/security.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);

export default router;
