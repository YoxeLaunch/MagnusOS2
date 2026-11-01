/**
 * MECE Phase 1C: Express HTTP End-to-End & Security Pipeline Test Suite
 * 
 * Verifies the complete security chain:
 * HTTP Request -> Express -> verifyJWT -> AuthSession -> MeceController -> Adapters -> HTTP Response
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'magnus_jwt_test_secret_key_1234567890_providence';
process.env.ENABLE_MECE_CONVERGENCE = 'false';

import { initDb, AuthSession } from '../server/models/index.js';
import routes from '../server/routes/index.js';
import { meceController } from '../server/routes/mece.routes.js';

describe('MECE Phase 1C: Full Express End-to-End & Security Pipeline', () => {
    let app;
    let server;
    let baseUrl;

    function signTestJwt(payload, secret = process.env.JWT_SECRET, expiresIn = '1h') {
        return jwt.sign(payload, secret, { expiresIn });
    }

    async function makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, baseUrl);
            const req = http.request(url, {
                method: options.method || 'GET',
                headers: options.headers || {}
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    let json = null;
                    try { json = JSON.parse(data); } catch (e) { json = data; }
                    resolve({ status: res.statusCode, headers: res.headers, body: json });
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    before(async () => {
        await initDb();

        app = express();
        app.use(express.json());
        app.use('/api', routes);

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                baseUrl = 'http://127.0.0.1:' + port;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) await new Promise(resolve => server.close(resolve));
    });

    // 1. Feature Flag OFF
    it('1. Feature Flag OFF: /api/mece/status devuelve enabled:false y endpoints devuelven 503', async () => {
        meceController.setFeatureFlag(false);

        const statusRes = await makeRequest('/api/mece/status');
        assert.equal(statusRes.status, 200);
        assert.equal(statusRes.body.enabled, false);
        assert.equal(statusRes.body.status, 'DISABLED_BY_FEATURE_FLAG');

        // Public catalog endpoint directly returns 503
        const catalogRes = await makeRequest('/api/mece/catalog');
        assert.equal(catalogRes.status, 503);
        assert.ok(catalogRes.body.error.includes('disabled by feature flag'));

        // Protected endpoint with valid token also returns 503
        const validToken = signTestJwt({ username: 'user_probe', role: 'user' });
        const incomeRes = await makeRequest('/api/mece/real-income', {
            headers: { 'Authorization': 'Bearer ' + validToken }
        });
        assert.equal(incomeRes.status, 503);
    });

    // 2. Dynamic Feature Flag Activation
    it('2. Activación Dinámica: Activa el motor sin reiniciar el servidor Express', async () => {
        meceController.setFeatureFlag(true);

        const statusRes = await makeRequest('/api/mece/status');
        assert.equal(statusRes.status, 200);
        assert.equal(statusRes.body.enabled, true);
        assert.equal(statusRes.body.status, 'ACTIVE');

        const catalogRes = await makeRequest('/api/mece/catalog');
        assert.equal(catalogRes.status, 200);
        assert.equal(catalogRes.body.success, true);
        assert.equal(catalogRes.body.familiesCount, 8);
    });

    // 3. Unauthenticated Access
    it('3. Autenticación Requerida: Petición sin Bearer token devuelve 401 Unauthorized', async () => {
        const incomeRes = await makeRequest('/api/mece/real-income');
        assert.equal(incomeRes.status, 401);
    });

    // 4. Revoked Session Token
    it('4. Revocación de Sesión: Token con jti revocado es denegado con 401', async () => {
        const revokedJti = uuidv4();
        // Create revoked session in DB
        await AuthSession.create({
            id: revokedJti,
            username: 'user_e2e_revoked',
            expiresAt: new Date(Date.now() + 3600000),
            revokedAt: new Date()
        });

        const token = signTestJwt({ username: 'user_e2e_revoked', role: 'user', jti: revokedJti });
        const res = await makeRequest('/api/mece/real-income', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        assert.equal(res.status, 401);
        assert.ok(res.body.error.includes('revocada') || res.body.error.includes('expirada'));
    });

    // 5. Valid Authenticated User Request
    it('5. Flujo Autenticado Válido: Usuario legítimo obtiene convergencia real en JSON', async () => {
        const validJti = uuidv4();
        await AuthSession.create({
            id: validJti,
            username: 'user_e2e_valid',
            expiresAt: new Date(Date.now() + 3600000),
            revokedAt: null
        });

        const token = signTestJwt({ username: 'user_e2e_valid', role: 'user', jti: validJti });
        const res = await makeRequest('/api/mece/real-income?basePeriod=2025-12', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.userId, 'user_e2e_valid');
        assert.equal(res.body.basePeriod, '2025-12');
        assert.ok(Array.isArray(res.body.series));
    });

    // 6. IDOR Tampering Defense
    it('6. Defensa contra IDOR: Usuario normal intentando ?userId=otro_usuario recibe 403', async () => {
        const attackerJti = uuidv4();
        await AuthSession.create({
            id: attackerJti,
            username: 'user_attacker',
            expiresAt: new Date(Date.now() + 3600000),
            revokedAt: null
        });

        const token = signTestJwt({ username: 'user_attacker', role: 'user', jti: attackerJti });
        const res = await makeRequest('/api/mece/real-income?userId=victim_user', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        assert.equal(res.status, 403);
        assert.ok(res.body.error.includes('Acceso denegado') || res.body.error.includes('IDOR'));
    });

    // 7. Legitimate Admin Cross-User Access with Cryptographic Audit
    it('7. Acceso Administrativo: Admin puede consultar con bitácora criptográfica Merkle', async () => {
        const adminJti = uuidv4();
        await AuthSession.create({
            id: adminJti,
            username: 'soberano',
            expiresAt: new Date(Date.now() + 3600000),
            revokedAt: null
        });

        const adminToken = signTestJwt({ username: 'soberano', role: 'admin', jti: adminJti });
        const res = await makeRequest('/api/mece/real-income?userId=user_monitored_beta', {
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.userId, 'user_monitored_beta');

        // Check audit log
        const auditRes = await makeRequest('/api/mece/audit-logs', {
            headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        assert.equal(auditRes.status, 200);
        assert.ok(auditRes.body.entries.length > 0);
        const last = auditRes.body.entries[auditRes.body.entries.length - 1];
        assert.equal(last.adminUser, 'soberano');
        assert.equal(last.targetUser, 'user_monitored_beta');
    });

    // 8. Cache Partitioning and Poisoning Protection
    it('8. Partición de Caché: Consultas de diferentes usuarios no colisionan ni contaminan', async () => {
        const jtiA = uuidv4();
        const jtiB = uuidv4();
        await AuthSession.create({ id: jtiA, username: 'user_cache_alpha', expiresAt: new Date(Date.now() + 3600000) });
        await AuthSession.create({ id: jtiB, username: 'user_cache_beta', expiresAt: new Date(Date.now() + 3600000) });

        const tokenA = signTestJwt({ username: 'user_cache_alpha', role: 'user', jti: jtiA });
        const tokenB = signTestJwt({ username: 'user_cache_beta', role: 'user', jti: jtiB });

        const resA1 = await makeRequest('/api/mece/exposure', {
            headers: { 'Authorization': 'Bearer ' + tokenA }
        });
        const resB1 = await makeRequest('/api/mece/exposure', {
            headers: { 'Authorization': 'Bearer ' + tokenB }
        });

        assert.equal(resA1.status, 200);
        assert.equal(resB1.status, 200);
        assert.equal(resA1.body.userId, 'user_cache_alpha');
        assert.equal(resB1.body.userId, 'user_cache_beta');
        assert.notEqual(resA1.body.userId, resB1.body.userId);
    });

    // 9. Tamper-Evident Audit Log Verification
    it('9. Detección de Manipulación en Bitácora: verifyChainIntegrity detecta alteraciones', async () => {
        const auditService = meceController.auditLogService;
        const validCheck = auditService.verifyChainIntegrity();
        assert.equal(validCheck.valid, true);

        // Tamper with an entry
        if (auditService.entries.length > 0) {
            const originalUser = auditService.entries[0].adminUser;
            auditService.entries[0].adminUser = 'hacker_tampered';
            const tamperedCheck = auditService.verifyChainIntegrity();
            assert.equal(tamperedCheck.valid, false);
            assert.equal(tamperedCheck.errorIndex, 0);

            // Restore
            auditService.entries[0].adminUser = originalUser;
            const restoredCheck = auditService.verifyChainIntegrity();
            assert.equal(restoredCheck.valid, true);
        }
    });
});
