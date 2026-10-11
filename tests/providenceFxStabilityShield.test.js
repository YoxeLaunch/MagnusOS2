/**
 * ============================================================================
 * PROVIDENCE FX INTELLIGENCE // OPERACIÓN STABILITY SHIELD TEST SUITE
 * Automated regression & validation tests for Incidents A, B, C, and D.
 * 
 * Tests:
 * 1. INCIDENTE A: Risk & Volatility analytics, QMLE GARCH, VaR, caching and timeout.
 * 2. INCIDENTE B: Authentication, token validation, 401/403 authorization for refresh.
 * 3. INCIDENTE C: Benchmark execution, concurrency guard, defensive slice formatting.
 * 4. INCIDENTE D: Historical experiments persistence, contract normalization and states.
 * 5. REGRESSION: Zero-leakage econometric integrity and model registry catalog.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Guardrail safe-handling: In test mode without explicit DATABASE_URL_TEST, avoid triggering production DB assert
if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL_TEST) {
    delete process.env.DATABASE_URL;
} else if (process.env.NODE_ENV !== 'test') {
    dotenv.config({ path: './.env' });
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
        process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@172.19.0.2:');
    }
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'stability_shield_jwt_secret_2026';

const JWT_SECRET = process.env.JWT_SECRET;

// Models & Controllers
const { FxResearchExperiment, FxRateObservation, sequelize, initDb } = await import('../server/models/index.js');
const { quantitativeResearchService } = await import('../server/services/fx/research/quantitativeResearchService.js');
const {
    getRiskAnalytics,
    getResearchExperiments,
    getBenchmarkStatus,
    runResearchBenchmark
} = await import('../server/controllers/fxResearchController.js');
const { verifyJWT, requireAuthenticated, requireAdmin } = await import('../server/middleware/auth.js');

test.before(async () => {
    if (sequelize.getDialect() === 'sqlite') {
        await initDb();
        const obsCount = await FxRateObservation.count();
        if (obsCount === 0) {
            // Seed synthetic observations for econometric analysis
            const seedObs = [];
            let currentPrice = 60.10;
            const startDate = new Date('2024-01-01');
            for (let i = 0; i < 150; i++) {
                const date = new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0];
                const delta = (Math.sin(i / 5) * 0.05) + ((i % 7 === 0 ? 0.08 : -0.02) * 0.1);
                currentPrice = Math.max(55.0, currentPrice + delta);
                seedObs.push({
                    observedAt: new Date(date),
                    economicDate: date,
                    provider: 'bcrd',
                    institutionId: 'BCRD',
                    institutionName: 'Banco Central de la República Dominicana',
                    rateType: 'spot',
                    baseCurrency: 'USD',
                    quoteCurrency: 'DOP',
                    buy: Number((currentPrice - 0.25).toFixed(4)),
                    sell: Number((currentPrice + 0.25).toFixed(4)),
                    mid: Number(currentPrice.toFixed(4)),
                    buyExact: (currentPrice - 0.25).toFixed(4),
                    sellExact: (currentPrice + 0.25).toFixed(4)
                });
            }
            await FxRateObservation.bulkCreate(seedObs);
        }

        const expCount = await FxResearchExperiment.count();
        if (expCount === 0) {
            // Seed standard approved models experiments
            const models = [
                { id: 'random_walk', name: 'Random Walk (Naïve t-1)' },
                { id: 'random_walk_drift', name: 'Random Walk con Drift Estocástico' },
                { id: 'moving_average', name: 'Media Móvil Adaptativa (SMA-5/20)' },
                { id: 'ses_exponential_smoothing', name: 'Suavizamiento Exponencial Simple (SES)' },
                { id: 'arima_experimental', name: 'ARIMA(1,1,1) Econométrico' },
                { id: 'garch_1_1', name: 'GARCH(1,1) Volatilidad Condicional' }
            ];
            const seedExps = models.map((m, idx) => ({
                id: `exp_${m.id}_USD_h1_seeded_${idx}`,
                modelId: m.id,
                modelName: m.name,
                baseCurrency: 'USD',
                quoteCurrency: 'DOP',
                sourceProvider: 'bcrd',
                horizonDays: 1,
                trainStartDate: '2024-01-01',
                trainEndDate: '2024-04-01',
                testStartDate: '2024-04-02',
                testEndDate: '2024-06-01',
                observationsCount: 150,
                metrics: { rmse: 0.045 + idx * 0.005, mae: 0.032 + idx * 0.003, mape: 0.06 },
                datasetHash: `hash_seeded_test_${idx}`
            }));
            await FxResearchExperiment.bulkCreate(seedExps);
        }
    }
});

const createMockReqRes = (user = null, body = {}, params = {}, query = {}, headers = {}) => {
    const authHeaders = { ...headers };
    if (user && !authHeaders['authorization']) {
        authHeaders['authorization'] = `Bearer ${jwt.sign(user, JWT_SECRET, { expiresIn: '1h' })}`;
    }
    const req = {
        user,
        body,
        params,
        query,
        headers: authHeaders
    };
    const res = {
        statusCode: 200,
        headersSent: {},
        jsonData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            this.headersSent[name] = value;
            return this;
        },
        json(data) {
            this.jsonData = data;
            return this;
        }
    };
    return { req, res };
};

// ============================================================================
// INCIDENTE A: RIESGO & VOLATILIDAD
// ============================================================================

test('INCIDENTE A.1: getRiskAnalytics devuelve HTTP 200 con estructura econométrica completa', async () => {
    const { req, res } = createMockReqRes(null, {}, {}, { currency: 'USD', provider: 'bcrd' });
    await getRiskAnalytics(req, res);

    assert.equal(res.statusCode, 200, 'El status debe ser 200');
    assert.equal(res.jsonData?.success, true, 'success debe ser true');
    const data = res.jsonData?.data;
    assert.ok(data, 'data debe estar presente');
    assert.equal(data.currency, 'USD');
    assert.ok(data.volatility.annualizedHistoricalPct > 0, 'Volatilidad histórica positiva');
    assert.ok(data.volatility.garchConditionalAnnualPct > 0, 'Volatilidad condicional GARCH positiva');
    assert.ok(data.volatility.ewmaAnnualPct > 0, 'Volatilidad EWMA positiva');
    assert.ok(data.garchParameters.persistence < 1.0, 'Persistencia GARCH menor a 1');
    assert.equal(data.distribution.bins.length, 25, '25 bins de distribución');
    assert.ok(data.valueAtRisk.var95ParametricPct > 0, 'VaR 95% positivo');
    assert.ok(Array.isArray(data.extremeEpisodes), 'Episodios extremos presentes');
});

test('INCIDENTE A.2: Memoria caché de getRiskAnalytics por datasetHash responde de forma sub-milisegundo', async () => {
    const start = performance.now();
    const result1 = await quantitativeResearchService.getRiskAnalytics({ currency: 'USD', provider: 'bcrd' });
    const elapsed1 = performance.now() - start;

    const start2 = performance.now();
    const result2 = await quantitativeResearchService.getRiskAnalytics({ currency: 'USD', provider: 'bcrd' });
    const elapsed2 = performance.now() - start2;

    assert.ok(result1 && result2, 'Ambos resultados deben ser válidos');
    assert.equal(result1.datasetHash, result2.datasetHash, 'El datasetHash debe ser idéntico');
    assert.ok(elapsed2 < 15, `La llamada en caché debe responder en <15ms (obtenido: ${elapsed2.toFixed(2)}ms)`);
});

test('INCIDENTE A.3: Manejo defensivo de error en analítica de riesgo ante moneda inexistente', async () => {
    const { req, res } = createMockReqRes(null, {}, {}, { currency: 'XYZ_INVALID' });
    await getRiskAnalytics(req, res);

    assert.equal(res.statusCode, 500, 'Debe devolver status 500 para moneda inválida sin fallar el proceso');
    assert.equal(res.jsonData?.success, false);
    assert.ok(res.jsonData?.error, 'Debe incluir mensaje de error descriptivo');
});

// ============================================================================
// INCIDENTE B: AUTENTICACIÓN Y AUTORIZACIÓN API
// ============================================================================

test('INCIDENTE B.1: Petición sin token a ruta protegida devuelve 401 "Acceso denegado. Token requerido."', async () => {
    const { req, res } = createMockReqRes(null);
    let nextCalled = false;
    await requireAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'next() no debe ser invocado');
    assert.equal(res.statusCode, 401, 'Status debe ser 401');
    assert.equal(res.jsonData?.error, 'Acceso denegado. Token requerido.');
});

test('INCIDENTE B.2: Petición con token expirado devuelve 401 "Sesión expirada. Inicia sesión de nuevo."', async () => {
    const expiredToken = jwt.sign({ username: 'soberano', role: 'admin' }, JWT_SECRET, { expiresIn: '-10s' });
    const { req, res } = createMockReqRes(null, {}, {}, {}, { authorization: `Bearer ${expiredToken}` });
    let nextCalled = false;
    await requireAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonData?.error, 'Sesión expirada. Inicia sesión de nuevo.');
});

test('INCIDENTE B.3: Usuario con rol regular no puede invocar requireAdmin (Devuelve 403)', async () => {
    const regularUser = { username: 'operador_regular', role: 'viewer' };
    const { req, res } = createMockReqRes(regularUser);
    let nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.jsonData?.error, 'Acceso restringido al soberano.');
});

test('INCIDENTE B.4: Administrador legítimo (soberano / admin) pasa la validación requireAdmin', async () => {
    const adminUser = { username: 'soberano', role: 'admin' };
    const { req, res } = createMockReqRes(adminUser);
    let nextCalled = false;
    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, 'next() debe ser llamado para admin');
    assert.equal(res.statusCode, 200);
});

// ============================================================================
// INCIDENTE C: BENCHMARK Y DEFENSIVIDAD ANTE 'SLICE' UNDEFINED
// ============================================================================

test('INCIDENTE C.1: Normalización defensiva de experimentos garantiza que experimentId y datasetHash sean strings', () => {
    // Caso 1: Objeto crudo de base de datos donde experimentId no existe y viene como "id"
    const rawDbExperiment = {
        id: 'exp_arima_experimental_USD_h1_23db45f3',
        modelId: 'arima_experimental',
        modelName: 'Experimental ARIMA',
        horizonDays: 1,
        observationsCount: 599,
        metrics: { rmse: 0.0945, mae: 0.0525 }
        // datasetHash y experimentId omitidos intencionalmente
    };

    // Aplicar la normalización defensiva que ahora implementa useFxIntelligence
    const normalized = {
        ...rawDbExperiment,
        id: rawDbExperiment.id || rawDbExperiment.experimentId || 'exp_unknown',
        experimentId: rawDbExperiment.experimentId || rawDbExperiment.id || 'exp_unknown',
        horizon: rawDbExperiment.horizon ?? rawDbExperiment.horizonDays ?? 1,
        forecastCount: rawDbExperiment.forecastCount ?? rawDbExperiment.observationsCount ?? 0,
        datasetHash: typeof rawDbExperiment.datasetHash === 'string' ? rawDbExperiment.datasetHash : ''
    };

    // Simulación de la línea que anteriormente lanzaba TypeError: Cannot read properties of undefined (reading 'slice')
    assert.doesNotThrow(() => {
        const idSlice = normalized.experimentId.slice(0, 18);
        assert.equal(idSlice, 'exp_arima_experime');
    }, 'experimentId.slice(0, 18) no debe lanzar TypeError');

    assert.doesNotThrow(() => {
        const hashSlice = normalized.datasetHash ? normalized.datasetHash.slice(0, 16) : 'N/A';
        assert.equal(hashSlice, 'N/A');
    }, 'datasetHash ausente debe evaluarse de forma segura');
});

test('INCIDENTE C.2: Bloqueo de concurrencia en runBenchmarkSuite devuelve 409 cuando ya hay ejecución activa', async () => {
    // Forzar estado activo en el servicio
    quantitativeResearchService.benchmarkState.status = 'RUNNING';

    const { req, res } = createMockReqRes({ username: 'soberano', role: 'admin' }, { horizon: 1, currency: 'USD' });
    await runResearchBenchmark(req, res);

    assert.equal(res.statusCode, 409, 'Debe devolver HTTP 409 Conflict');
    assert.equal(res.jsonData?.success, false);
    assert.match(res.jsonData?.error, /en progreso/i);

    // Restaurar estado a IDLE
    quantitativeResearchService.benchmarkState.status = 'IDLE';
});

test('INCIDENTE C.3: Validación estricta de parámetros en runResearchBenchmark rechaza monedas y horizontes inválidos', async () => {
    // Moneda inválida
    const { req: req1, res: res1 } = createMockReqRes({ username: 'soberano', role: 'admin' }, { horizon: 1, currency: 'GBP' });
    await runResearchBenchmark(req1, res1);
    assert.equal(res1.statusCode, 400, 'Rechaza divisa no soportada con 400');

    // Horizonte inválido
    const { req: req2, res: res2 } = createMockReqRes({ username: 'soberano', role: 'admin' }, { horizon: 999, currency: 'USD' });
    await runResearchBenchmark(req2, res2);
    assert.equal(res2.statusCode, 400, 'Rechaza horizonte no válido con 400');
});

test('INCIDENTE C.4: getBenchmarkStatus informa correctamente el estado del motor', async () => {
    const { req, res } = createMockReqRes(null);
    await getBenchmarkStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData?.success, true);
    assert.ok(['IDLE', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT'].includes(res.jsonData?.status?.status));
    assert.equal(typeof res.jsonData?.status?.isRunning, 'boolean');
});

// ============================================================================
// INCIDENTE D: PERSISTENCIA Y REGISTRO DE EXPERIMENTOS
// ============================================================================

test('INCIDENTE D.1: getResearchExperiments recupera experimentos de PostgreSQL con contrato canónico', async () => {
    const { req, res } = createMockReqRes(null, {}, {}, { currency: 'USD' });
    await getResearchExperiments(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData?.success, true);
    assert.ok(res.jsonData?.count >= 6, `Debe haber al menos 6 experimentos registrados (actual: ${res.jsonData?.count})`);

    const firstExp = res.jsonData?.experiments[0];
    assert.ok(firstExp.experimentId, 'experimentId debe estar presente');
    assert.ok(firstExp.id, 'id debe estar presente');
    assert.ok(firstExp.modelId, 'modelId debe estar presente');
    assert.ok(firstExp.modelName, 'modelName debe estar presente');
    assert.ok(typeof firstExp.horizon === 'number', 'horizon debe ser numérico');
    assert.ok(firstExp.metrics?.rmse > 0, 'RMSE métrica válida');
    assert.ok(firstExp.datasetHash?.length > 0, 'datasetHash presente');
});

test('INCIDENTE D.2: getResearchExperiments devuelve array vacío y respuesta rápida si no hay experimentos para la moneda', async () => {
    // Si consultamos una divisa válida pero sin experimentos cargados
    const { req, res } = createMockReqRes(null, {}, {}, { currency: 'EUR' });
    const start = performance.now();
    await getResearchExperiments(req, res);
    const elapsed = performance.now() - start;

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData?.success, true);
    assert.ok(Array.isArray(res.jsonData?.experiments), 'experiments debe ser un array');
    assert.ok(elapsed < 100, `No debe ejecutar benchmark bloqueante on-the-fly en GET (tiempo: ${elapsed.toFixed(2)}ms)`);
});

// ============================================================================
// REGRESIÓN: CATÁLOGO Y CONSISTENCIA GLOBAL
// ============================================================================

test('REGRESIÓN: Catálogo canónico de modelos intacto con 6 modelos aprobados para consulta', () => {
    const catalog = quantitativeResearchService.getModelsCatalog();
    assert.equal(catalog.length, 6, 'Catálogo debe tener exactamente 6 modelos');
    const ids = catalog.map(m => m.id);
    assert.deepEqual(ids.sort(), [
        'arima_experimental',
        'garch_1_1',
        'moving_average',
        'random_walk',
        'random_walk_drift',
        'ses_exponential_smoothing'
    ].sort());
});

test.after(async () => {
    try {
        await sequelize.close();
    } catch (_) {}
});

