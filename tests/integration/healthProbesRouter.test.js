import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { initializeTestPostgres, TEST_DB_URL, sequelize } from './setupTestDb.js';
import routes from '../../server/routes/index.js';
import healthRoutes from '../../server/routes/health.routes.js';
import { apiLimiter } from '../../server/middleware/security.js';

describe('Health Probes & Routing Decoupling Integration (Phase II Remediation)', () => {
    let server;
    let baseUrl;
    const testSecret = process.env.JWT_SECRET || 'test_magnus_secret_for_health';
    let userToken;
    let adminToken;

    before(async () => {
        process.env.JWT_SECRET = testSecret;
        await initializeTestPostgres();

        userToken = jwt.sign({ username: 'test_regular', role: 'user' }, testSecret, { expiresIn: '1h' });
        adminToken = jwt.sign({ username: 'soberano', role: 'admin' }, testSecret, { expiresIn: '1h' });

        const app = express();
        app.use(apiLimiter);
        app.use(express.json());

        // Mount identically to server/index.js
        app.use('/health', healthRoutes);
        app.use('/api/health', healthRoutes);
        app.use('/api', routes);

        server = http.createServer(app);
        await new Promise((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                const addr = server.address();
                baseUrl = `http://127.0.0.1:${addr.port}`;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        try {
            await sequelize.close();
        } catch (_) {}
    });

    it('1. Public Liveness: GET /health/live responde 200 UP sin requerir autenticacion', async () => {
        const res = await fetch(`${baseUrl}/health/live`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'UP');
        assert.equal(data.version, '2.0.0');
        assert.ok(typeof data.uptimeSeconds === 'number');
    });

    it('2. Public Liveness: GET /api/health y /api/health/live responden 200 UP sin autenticacion', async () => {
        const resRoot = await fetch(`${baseUrl}/api/health`);
        assert.equal(resRoot.status, 200);
        const dataRoot = await resRoot.json();
        assert.equal(dataRoot.status, 'UP');

        const resLive = await fetch(`${baseUrl}/api/health/live`);
        assert.equal(resLive.status, 200);
        const dataLive = await resLive.json();
        assert.equal(dataLive.status, 'UP');
    });

    it('3. Public Readiness: GET /health/ready y /api/health/ready responden 200 READY', async () => {
        const res = await fetch(`${baseUrl}/health/ready`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'READY');
        assert.equal(data.checks.database, true);
        assert.equal(data.checks.migrations, true);
        assert.equal(data.checks.schemaDrift, true);

        const resApi = await fetch(`${baseUrl}/api/health/ready`);
        assert.equal(resApi.status, 200);
        const dataApi = await resApi.json();
        assert.equal(dataApi.status, 'READY');
    });

    it('4. Protected Deep Health: GET /health/deep sin token responde 401 Unauthorized', async () => {
        const res = await fetch(`${baseUrl}/health/deep`);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.ok(data.error.includes('Token requerido'));
    });

    it('5. Protected Deep Health: GET /api/health/deep sin token responde 401 Unauthorized', async () => {
        const res = await fetch(`${baseUrl}/api/health/deep`);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.ok(data.error.includes('Token requerido'));
    });

    it('6. Protected Deep Health: usuario regular sin rol admin recibe 403 Forbidden', async () => {
        const res = await fetch(`${baseUrl}/health/deep`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.ok(data.error.includes('restringido'));
    });

    it('7. Protected Deep Health: usuario admin / soberano recibe 200 OK con telemetria sanitizada', async () => {
        const res = await fetch(`${baseUrl}/health/deep`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.ok(['HEALTHY', 'DEGRADED'].includes(data.status));
        assert.ok(data.services);
        assert.ok(data.services.database);
        assert.equal(data.services.database.status, 'HEALTHY');

        const rawJson = JSON.stringify(data);
        assert.ok(!rawJson.includes('magnus_test_secret_pass'), 'Zero credential leakage: password de DB jamas expuesto');
        assert.ok(!rawJson.includes(testSecret), 'Zero credential leakage: JWT_SECRET jamas expuesto');
    });
});
