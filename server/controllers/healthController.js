import { sequelize } from '../config/database.js';
import { fxService } from '../services/fx/fxService.js';

export const getHealth = (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
};

export const getDeepHealth = async (req, res) => {
    const report = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        memory: process.memoryUsage(),
        services: {
            app: { status: 'healthy' },
            postgres: { status: 'unknown' },
            sandbox: { status: 'unknown' },
            fxCache: { status: 'unknown' }
        }
    };

    // 1. PostgreSQL check
    try {
        await sequelize.authenticate();
        report.services.postgres = { status: 'healthy', dialect: sequelize.getDialect() };
    } catch (dbErr) {
        report.status = 'degraded';
        report.services.postgres = { status: 'unhealthy', error: dbErr.message };
    }

    // 2. Sandbox check (internal network, short timeout)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const sandboxRes = await fetch('http://sandbox:5000/health', { signal: controller.signal });
        clearTimeout(timeout);
        if (sandboxRes.ok) {
            report.services.sandbox = { status: 'healthy' };
        } else {
            report.services.sandbox = { status: 'degraded', httpStatus: sandboxRes.status };
        }
    } catch (sandboxErr) {
        report.services.sandbox = { status: 'unreachable', message: sandboxErr.message };
    }

    // 3. FX Cache check
    try {
        const usdDop = fxService?.cache?.get('USD/DOP');
        report.services.fxCache = {
            status: 'healthy',
            pairsCached: fxService?.cache?.size || 0,
            hasUsdDop: !!usdDop
        };
    } catch (fxErr) {
        report.services.fxCache = { status: 'degraded', error: fxErr.message };
    }

    const statusCode = report.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(report);
};
