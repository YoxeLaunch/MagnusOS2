/**
 * MECE Routes Definition (Phase 1C Certified ESM)
 * Target deployment path: server/routes/mece.routes.js
 * 
 * Mount point: router.use('/mece', meceRoutes) in server/routes/index.js
 * Full URL: /api/mece/*
 */

import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { MeceController } from '../controllers/meceController.js';

const router = Router();
const meceController = new MeceController();

// 1. Public Endpoints (Discovery & Observatory)
router.get('/status', (req, res) => {
    const result = meceController.handleGetStatus(req, res);
    return res.status(result.status).json(result.body);
});

router.get('/catalog', (req, res) => {
    try {
        const result = meceController.handleGetCatalog(req, res);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

// 2. Protected Financial Endpoints (Requires valid JWT session)
router.get('/real-income', verifyJWT, async (req, res) => {
    try {
        const result = await meceController.handleGetRealIncome(req, res);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/exposure', verifyJWT, async (req, res) => {
    try {
        const result = await meceController.handleGetExposure(req, res);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/data-quality', verifyJWT, (req, res) => {
    try {
        const result = meceController.handleGetDataQuality(req, res);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

router.get('/audit-logs', verifyJWT, (req, res) => {
    try {
        const result = meceController.handleGetAuditLogs(req, res);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
});

export default router;
export { router as meceRoutes, meceController };
