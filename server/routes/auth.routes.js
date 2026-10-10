import { Router } from 'express';
import { login, register, logout } from '../controllers/authController.js';
import { authLimiter } from '../middleware/security.js';
import { verifyJWT } from '../middleware/auth.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/logout', verifyJWT, logout);

export default router;
