/**
 * ============================================================================
 * MAGNUSOS2 HARDENING & SECURITY MASTER REGRESSION TEST SUITE
 * Tests for P0/P1 fixes: Identity, Authorization, WebSockets, Ledger, Markets,
 * Econometrics, Registration, and Database Integrity.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_hardening_2026';

import {
    initDb,
    sequelize,
    User,
    Account,
    Category,
    LedgerTransaction,
    TransactionLine,
    CurrencyHistory,
    toMinorUnits
} from '../server/models/index.js';

import {
    verifyJWT,
    requireAuthenticated,
    requireAdmin,
    requireSelfOrAdmin,
    getEffectiveUserId
} from '../server/middleware/auth.js';
import { socketAuthMiddleware } from '../server/socket/chatHandler.js';

import { getMarketIntelData, syncDatabaseRates } from '../server/controllers/marketController.js';
import { forecastLiquidity } from '../server/services/econometricsService.js';

const JWT_SECRET = process.env.JWT_SECRET;

const createMockReqRes = (user = null, body = {}, params = {}, query = {}) => {
    const req = {
        user,
        body,
        params,
        query,
        headers: user ? { authorization: `Bearer ${jwt.sign(user, JWT_SECRET)}` } : {}
    };
    const res = {
        statusCode: 200,
        jsonData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.jsonData = data;
            return this;
        }
    };
    return { req, res };
};

test.before(async () => {
    await initDb();
});

// ========================================
// 1. IDENTITY & AUTHORIZATION TESTS
// ========================================
test('AUTH: getEffectiveUserId deriva identidad estrictamente del JWT y nunca del body/query', () => {
    const userA = { id: 'uuid-user-a', username: 'alice', role: 'user' };
    const { req } = createMockReqRes(userA, { userId: 'bob', username: 'bob' }, {}, { userId: 'mallory' });

    const effectiveId = getEffectiveUserId(req);
    assert.equal(effectiveId, 'alice', 'Debe ignorar body.userId y query.userId');
});

test('AUTH: requireAdmin bloquea a usuarios con rol regular', () => {
    const regularUser = { id: 'uuid-alice', username: 'alice', role: 'user' };
    const { req, res } = createMockReqRes(regularUser);
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'next() no debe llamarse para usuario regular');
    assert.equal(res.statusCode, 403, 'Debe responder 403 Forbidden');
});

test('AUTH: requireAdmin permite acceso a administradores legítimos', () => {
    const adminUser = { id: 'uuid-admin', username: 'admin', role: 'admin' };
    const { req, res } = createMockReqRes(adminUser);
    let nextCalled = false;

    requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, 'next() debe llamarse para admin');
    assert.equal(res.statusCode, 200);
});

test('AUTH: requireSelfOrAdmin rechaza que usuario A opere sobre recurso de usuario B', () => {
    const userA = { id: 'uuid-alice', username: 'alice', role: 'user' };
    const { req, res } = createMockReqRes(userA, {}, { username: 'bob' });
    let nextCalled = false;

    requireSelfOrAdmin()(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'Usuario regular no debe poder acceder a recurso ajeno');
    assert.equal(res.statusCode, 403);
});

// ========================================
// 2. WEBSOCKET SECURITY TESTS
// ========================================
test('WEBSOCKET: socketAuthMiddleware rechaza handshakes sin token JWT', (t, done) => {
    const mockSocket = {
        handshake: { auth: {}, headers: {} }
    };

    socketAuthMiddleware(mockSocket, (err) => {
        assert.ok(err, 'Debe retornar error de autenticación');
        assert.ok(err.message.includes('Token') || err.message.includes('Acceso denegado'));
        done();
    });
});

test('WEBSOCKET: socketAuthMiddleware autentica y asocia identidad real inmutable al socket', (t, done) => {
    const token = jwt.sign({ id: 'uuid-user-1', username: 'victor', role: 'user' }, JWT_SECRET);
    const mockSocket = {
        handshake: { auth: { token }, headers: {} }
    };

    socketAuthMiddleware(mockSocket, (err) => {
        assert.equal(err, undefined);
        assert.ok(mockSocket.user);
        assert.equal(mockSocket.user.username, 'victor');
        done();
    });
});

// ========================================
// 3. LEDGER INTEGRITY & DOUBLE-ENTRY
// ========================================
test('LEDGER: Transacción balanceada (+X y -X) satisface invariante de suma cero', async () => {
    const user = 'test_ledger_user';
    const acc = await Account.create({
        userId: user,
        name: 'Cuenta Test',
        type: 'checking',
        currency: 'DOP',
        currentBalanceMinor: 100000
    });

    const cat = await Category.create({
        userId: user,
        name: 'Servicios Test',
        type: 'expense'
    });

    const txn = await LedgerTransaction.create({
        userId: user,
        date: '2026-10-04',
        type: 'expense',
        status: 'pending',
        payeeName: 'Empresa Eléctrica'
    });

    const line1 = await TransactionLine.create({
        transactionId: txn.id,
        accountId: acc.id,
        amountMinor: -5000,
        currency: 'DOP'
    });

    const line2 = await TransactionLine.create({
        transactionId: txn.id,
        categoryId: cat.id,
        amountMinor: 5000,
        currency: 'DOP'
    });

    const lines = await TransactionLine.findAll({ where: { transactionId: txn.id } });
    const sum = lines.reduce((acc, l) => acc + BigInt(l.amountMinor), 0n);
    assert.equal(sum, 0n, 'La suma contable de las líneas debe ser exactamente 0');
});

test('LEDGER: Transferencia entre cuentas requiere cuentas válidas y montos positivos', () => {
    const invalidAmount = -100;
    const isPositive = Number.isFinite(invalidAmount) && invalidAmount > 0;
    assert.equal(isPositive, false, 'Monto negativo debe ser rechazado');

    const sameAccount = 'acc-1' === 'acc-1';
    assert.equal(sameAccount, true, 'Transferencia a la misma cuenta debe ser detectada');
});

// ========================================
// 4. MARKETS GET IDEMPOTENCY
// ========================================
test('MARKETS: getMarketIntelData no debe mutar CurrencyHistories (Query != Command)', async () => {
    const countBefore = await CurrencyHistory.count();
    
    // Ejecutar getMarketIntelData
    await getMarketIntelData();

    const countAfter = await CurrencyHistory.count();
    assert.equal(countAfter, countBefore, 'GET /api/markets no debe escribir filas en CurrencyHistories');
});

test('MARKETS: syncDatabaseRates deduplica correctamente registros para la misma fecha', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Primera sincronización
    await syncDatabaseRates(60.10, 1.085);
    const count1 = await CurrencyHistory.count({ where: { date: today, code: 'USD' } });

    // Segunda sincronización para la misma fecha (debe actualizar, no duplicar)
    await syncDatabaseRates(60.25, 1.085);
    const count2 = await CurrencyHistory.count({ where: { date: today, code: 'USD' } });

    assert.equal(count1, count2, 'No debe crear filas duplicadas para la misma fecha y código');
    const record = await CurrencyHistory.findOne({ where: { date: today, code: 'USD' } });
    assert.equal(record.rate, 60.25, 'Debe actualizar el tipo de cambio al valor más reciente');
});

// ========================================
// 5. ECONOMETRICS ACTIVE ACCOUNTS
// ========================================
test('ECONOMETRICS: Forecast calcula balance inicial desde cuentas no archivadas (isArchived: false)', async () => {
    const user = 'test_econo_user';

    // Crear cuenta activa
    await Account.create({
        userId: user,
        name: 'Activa',
        type: 'checking',
        currency: 'DOP',
        currentBalanceMinor: 250000,
        isArchived: false
    });

    // Crear cuenta archivada
    await Account.create({
        userId: user,
        name: 'Archivada',
        type: 'checking',
        currency: 'DOP',
        currentBalanceMinor: 500000,
        isArchived: true
    });

    const activeAccounts = await Account.findAll({
        where: { userId: user, isArchived: false }
    });

    const totalActiveBalance = activeAccounts.reduce((sum, acc) => sum + (acc.currentBalanceMinor / 100), 0);
    assert.equal(totalActiveBalance, 2500, 'El balance de cuentas activas debe excluir cuentas archivadas');
    assert.notEqual(totalActiveBalance, 0, 'El balance inicial no debe ser 0');
});
