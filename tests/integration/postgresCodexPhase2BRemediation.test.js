import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import {
    TEST_DB_URL,
    assertSafeTestEnvironment,
    sequelize,
    initializeTestPostgres
} from './setupTestDb.js';

import {
    User,
    Account,
    Category,
    Payee,
    LedgerTransaction,
    TransactionLine,
    DailyTransaction,
    SavingsGoal,
    SavingsContribution,
    toMinorUnits,
    toMinorUnitsBigInt,
    fromMinorUnits,
    minorToDecimalString
} from '../../server/models/index.js';

import { LedgerReadService } from '../../server/services/ledgerReadService.js';
import {
    createTransaction,
    deleteTransaction,
    getCashFlowSummary
} from '../../server/controllers/ledgerController.js';
import {
    updateAccount,
    getAccountBalance
} from '../../server/controllers/accountsController.js';
import {
    createSavingsGoal,
    addContribution
} from '../../server/controllers/savingsController.js';

function mockReqRes(reqData = {}) {
    const req = {
        body: reqData.body || {},
        params: reqData.params || {},
        query: reqData.query || {},
        user: reqData.user || { username: 'test_user', role: 'user' }
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        },
        send: (data) => {
            responseData = data;
            return res;
        }
    };
    return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

describe('PostgreSQL Adversarial Remediation — Codex Review Phase II-B', () => {
    before(async () => {
        assertSafeTestEnvironment(TEST_DB_URL);
        await initializeTestPostgres();
    });

    it('BLOCKER-01: Creación normal no corrompe saldos BIGINT por concatenación de strings', async () => {
        const userId = 'pg_blk1_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Blocker1 User' });

        // Cuenta con saldo inicial '100000' (1,000.00 DOP)
        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Cuenta Operativa',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: '100000',
            currentBalanceMinor: '100000'
        });

        const cat = await Category.create({
            id: uuidv4(),
            userId,
            name: 'Sueldo',
            type: 'income'
        });

        // Ingreso de 5.00 DOP (+5.00 en cuenta, -5.00 en categoría)
        const { req, res, getStatus } = mockReqRes({
            user: { username: userId, role: 'user' },
            body: {
                date: '2026-10-04',
                type: 'income',
                lines: [
                    { accountId: acc.id, amount: 5.00, currency: 'DOP' },
                    { categoryId: cat.id, amount: -5.00, currency: 'DOP' }
                ]
            }
        });

        await createTransaction(req, res);
        assert.equal(getStatus(), 201);

        // Recargar cuenta desde PostgreSQL
        const updatedAcc = await Account.findByPk(acc.id);

        // Invariante crítica: DEBE ser '100500' (1,005.00 DOP), NUNCA concatenado '100000500' (1,000,005.00 DOP)
        assert.equal(updatedAcc.currentBalanceMinor, '100500', 'Debe sumar 100000 + 500 = 100500, no concatenar strings');
        assert.notEqual(updatedAcc.currentBalanceMinor, '100000500', 'NO debe haber concatenación');

        // Comprobar reconciliación exacta: cached == opening + sum(lines)
        const balances = await LedgerReadService.getBalances({ userId });
        assert.equal(balances.accounts[0].isReconciled, true);
        assert.equal(balances.accounts[0].derivedBalanceMinor, '100500');
        assert.equal(balances.accounts[0].currentBalanceMinor, '100500');
    });

    it('BLOCKER-01 (Delete): Reversión atómica restaura saldo exacto en BigInt', async () => {
        const userId = 'pg_blk1_del_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Del User' });

        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Cuenta A',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: '100000',
            currentBalanceMinor: '100000'
        });

        const cat = await Category.create({ id: uuidv4(), userId, name: 'Bonus', type: 'income' });

        const { req: createReq, res: createRes, getData: getCreated } = mockReqRes({
            user: { username: userId, role: 'user' },
            body: {
                date: '2026-10-04',
                type: 'income',
                lines: [
                    { accountId: acc.id, amount: 20.00, currency: 'DOP' },
                    { categoryId: cat.id, amount: -20.00, currency: 'DOP' }
                ]
            }
        });

        await createTransaction(createReq, createRes);
        const createdTx = getCreated();

        const midAcc = await Account.findByPk(acc.id);
        assert.equal(midAcc.currentBalanceMinor, '102000');

        // Delete transaction
        const { req: delReq, res: delRes, getStatus: getDelStatus } = mockReqRes({
            user: { username: userId, role: 'user' },
            params: { id: createdTx.id }
        });
        await deleteTransaction(delReq, delRes);
        assert.equal(getDelStatus(), 204);

        // Saldo restaurado exactamente a '100000'
        const restoredAcc = await Account.findByPk(acc.id);
        assert.equal(restoredAcc.currentBalanceMinor, '100000');
        const balances = await LedgerReadService.getBalances({ userId });
        assert.equal(balances.accounts[0].isReconciled, true);
    });

    it('BLOCKER-01 (Savings): addContribution suma en BigInt sin concatenación', async () => {
        const userId = 'pg_blk1_sav_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Savings User' });

        const goal = await SavingsGoal.create({
            id: uuidv4(),
            userId,
            name: 'Fondo Emergencia',
            targetAmountMinor: '500000', // 5,000.00 DOP
            currentAmountMinor: '100000', // 1,000.00 DOP inicial
            currency: 'DOP'
        });

        const { req, res, getStatus } = mockReqRes({
            user: { username: userId, role: 'user' },
            params: { id: goal.id },
            body: { amount: 5.00 } // 500 minor units
        });

        await addContribution(req, res);
        assert.equal(getStatus(), 201);

        const updatedGoal = await SavingsGoal.findByPk(goal.id);
        assert.equal(updatedGoal.currentAmountMinor, '100500', 'Debe sumar 100000 + 500 = 100500 en BigInt');
        assert.notEqual(updatedGoal.currentAmountMinor, '100000500');
    });

    it('BLOCKER-02: Entrada externa con contraparte no-account etiquetada "transfer" computa como ingreso', async () => {
        const userId = 'pg_blk2_ext_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'External Transfer User' });

        const acc = await Account.create({ id: uuidv4(), userId, name: 'Banco', type: 'checking', currency: 'DOP' });
        const cat = await Category.create({ id: uuidv4(), userId, name: 'Depósito Externo', type: 'income' });

        // Asiento: cuenta +300.00, categoría -300.00, pero erróneamente etiquetado como "transfer" en cabecera
        const t = await sequelize.transaction();
        const tx = await LedgerTransaction.create({
            id: uuidv4(),
            userId,
            date: '2026-10-04',
            type: 'transfer', // Etiqueta engañosa
            status: 'cleared'
        }, { transaction: t });
        await TransactionLine.create({
            id: uuidv4(),
            transactionId: tx.id,
            accountId: acc.id,
            amountMinor: 30000, // +300.00 DOP
            currency: 'DOP'
        }, { transaction: t });
        await TransactionLine.create({
            id: uuidv4(),
            transactionId: tx.id,
            accountId: null,
            categoryId: cat.id,
            amountMinor: -30000, // -300.00 DOP
            currency: 'DOP'
        }, { transaction: t });
        await t.commit();

        // En getCashFlow, NO debe ser ignorada porque no es transferencia entre cuentas propias
        const flow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(flow.totalIncome, 300, 'Debe registrar 300 de ingreso');
        assert.equal(flow.netCashFlow, 300, 'Net cash flow debe reflejar el ingreso de 300');
    });

    it('BLOCKER-02: Reasignación propia cash -> inversión etiquetada "investment" es neutra para cash flow operacional consolidado', async () => {
        const userId = 'pg_blk2_inv_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Invest User' });

        const cashAcc = await Account.create({ id: uuidv4(), userId, name: 'Efectivo', type: 'cash', currency: 'DOP', openingBalanceMinor: '100000', currentBalanceMinor: '80000' });
        const invAcc = await Account.create({ id: uuidv4(), userId, name: 'Cuenta Bursátil', type: 'investment', currency: 'DOP', openingBalanceMinor: '0', currentBalanceMinor: '20000' });

        // Movimiento entre dos cuentas del mismo usuario: Efectivo -200, Bursátil +200, etiquetada 'investment'
        const t = await sequelize.transaction();
        const tx = await LedgerTransaction.create({
            id: uuidv4(),
            userId,
            date: '2026-10-04',
            type: 'investment',
            status: 'cleared'
        }, { transaction: t });
        await TransactionLine.create({
            id: uuidv4(),
            transactionId: tx.id,
            accountId: cashAcc.id,
            amountMinor: -20000, // -200 DOP
            currency: 'DOP'
        }, { transaction: t });
        await TransactionLine.create({
            id: uuidv4(),
            transactionId: tx.id,
            accountId: invAcc.id,
            amountMinor: 20000, // +200 DOP
            currency: 'DOP'
        }, { transaction: t });
        await t.commit();

        const flow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(flow.totalInvested, 0, 'No es salida externa de capital, es reasignación interna');
        assert.equal(flow.netCashFlow, 0, 'Flujo neto operacional consolidado debe ser neutro (0)');

        const netWorth = await LedgerReadService.getNetWorth({ userId });
        assert.equal(netWorth.netWorth, 1000, 'Patrimonio consolidado se conserva intacto en 1,000 DOP');
    });

    it('HIGH-01: Gasto 100 seguido de reembolso (refund) 40 produce gasto neto 60 y flujo neto -60', async () => {
        const userId = 'pg_h1_ref_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Refund User' });

        const acc = await Account.create({ id: uuidv4(), userId, name: 'Tarjeta', type: 'checking', currency: 'DOP' });
        const cat = await Category.create({ id: uuidv4(), userId, name: 'Restaurantes', type: 'expense' });

        // 1. Gasto de 100.00 DOP (cuenta -100, categoría +100)
        const t1 = await sequelize.transaction();
        const tx1 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'expense', status: 'cleared' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: acc.id, amountMinor: -10000, currency: 'DOP' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: null, categoryId: cat.id, amountMinor: 10000, currency: 'DOP' }, { transaction: t1 });
        await t1.commit();

        // 2. Reembolso de 40.00 DOP (cuenta +40, categoría -40)
        const t2 = await sequelize.transaction();
        const tx2 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-02', type: 'expense', status: 'cleared' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: acc.id, amountMinor: 4000, currency: 'DOP' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: null, categoryId: cat.id, amountMinor: -4000, currency: 'DOP' }, { transaction: t2 });
        await t2.commit();

        const flow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(flow.totalExpense, 60, 'El gasto total debe ser 60 (100 - 40)');
        assert.equal(flow.netCashFlow, -60, 'El flujo neto debe ser -60');

        const expenses = await LedgerReadService.getExpenses({ userId });
        assert.equal(expenses.totalExpense, 60, 'getExpenses debe netear el reembolso a 60');
    });

    it('HIGH-02: Filtro de fechas en endpoint getCashFlowSummary soporta startDate y endDate', async () => {
        const userId = 'pg_h2_date_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Date User' });
        const acc = await Account.create({ id: uuidv4(), userId, name: 'Caja', type: 'cash', currency: 'DOP' });
        const cat = await Category.create({ id: uuidv4(), userId, name: 'Ventas', type: 'income' });

        // Octubre 01: +100
        const t1 = await sequelize.transaction();
        const tx1 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'income', status: 'cleared' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: acc.id, amountMinor: 10000, currency: 'DOP' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: null, categoryId: cat.id, amountMinor: -10000, currency: 'DOP' }, { transaction: t1 });
        await t1.commit();

        // Noviembre 01: +500
        const t2 = await sequelize.transaction();
        const tx2 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-11-01', type: 'income', status: 'cleared' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: acc.id, amountMinor: 50000, currency: 'DOP' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: null, categoryId: cat.id, amountMinor: -50000, currency: 'DOP' }, { transaction: t2 });
        await t2.commit();

        // Test con query params startDate / endDate (usados por el cliente frontend)
        const { req, res, getData } = mockReqRes({
            user: { username: userId, role: 'user' },
            query: { startDate: '2026-10-01', endDate: '2026-10-31' }
        });
        await getCashFlowSummary(req, res);
        const data = getData();

        assert.equal(data.totalIncome, 100, 'Debe incluir solo la transacción de octubre');
        assert.equal(data.transactionCount, 1);
    });

    it('HIGH-03 & MEDIUM-02: Aislamiento estricto de cuentas vinculadas a metas de ahorro', async () => {
        const userA = 'pg_h3_a_' + uuidv4().slice(0, 8);
        const userB = 'pg_h3_b_' + uuidv4().slice(0, 8);
        await User.bulkCreate([
            { username: userA, password: 'x', name: 'User A' },
            { username: userB, password: 'x', name: 'User B' }
        ]);

        const accB = await Account.create({ id: uuidv4(), userId: userB, name: 'Cuenta de B', type: 'checking', currency: 'DOP', currentBalanceMinor: '100000' });

        // Intento de userA (o admin para userA) de vincular una cuenta perteneciente a userB
        const { req, res, getStatus } = mockReqRes({
            user: { username: userA, role: 'admin' }, // Incluso con rol admin
            body: {
                userId: userA,
                name: 'Meta A',
                targetAmount: 5000,
                linkedAccountId: accB.id
            }
        });

        await createSavingsGoal(req, res);
        assert.equal(getStatus(), 403, 'Debe rechazar vincular cuenta de otro usuario con 403');
    });

    it('HIGH-04: toMinorUnits y fromMinorUnits exactos para cadenas extremas', () => {
        // '90071992547409.93' debe dar exactamente '9007199254740993', no '9007199254740994'
        const converted = toMinorUnits('90071992547409.93');
        assert.equal(converted, '9007199254740993');

        // toMinorUnitsBigInt exacto
        const big = toMinorUnitsBigInt('90071992547409.93');
        assert.equal(big, 9007199254740993n);

        // fromMinorUnits('9007199254740991') conserva representación centesimal exacta (.91, no .9)
        const formatted = fromMinorUnits('9007199254740991');
        assert.equal(formatted, '90071992547409.91');

        // minorToDecimalString exacto
        assert.equal(minorToDecimalString('9007199254740993'), '90071992547409.93');
        assert.equal(minorToDecimalString('-4000'), '-40.00');
        assert.equal(minorToDecimalString('500'), '5.00');
    });

    it('HIGH-06: Modificar saldo inicial está bloqueado si la cuenta tiene movimientos', async () => {
        const userId = 'pg_h6_op_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Open User' });

        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Cuenta Con Movimientos',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: '10000',
            currentBalanceMinor: '10000'
        });

        const cat = await Category.create({ id: uuidv4(), userId, name: 'Venta', type: 'income' });

        // Registrar un movimiento
        const t = await sequelize.transaction();
        const tx = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-04', type: 'income', status: 'cleared' }, { transaction: t });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx.id, accountId: acc.id, amountMinor: 5000, currency: 'DOP' }, { transaction: t });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx.id, accountId: null, categoryId: cat.id, amountMinor: -5000, currency: 'DOP' }, { transaction: t });
        await t.commit();

        // Intento de alterar openingBalance mediante PATCH
        const { req, res, getStatus } = mockReqRes({
            user: { username: userId, role: 'user' },
            params: { id: acc.id },
            body: { openingBalance: 99999 }
        });

        await updateAccount(req, res);
        assert.equal(getStatus(), 400, 'Debe rechazar alterar saldo inicial cuando ya hay transacciones');

        // Comprobar que no cambió
        const reloaded = await Account.findByPk(acc.id);
        assert.equal(reloaded.openingBalanceMinor, '10000');
    });

    it('LOW-01: Endpoint getAccountBalance respeta parámetro asOf histórico', async () => {
        const userId = 'pg_l1_asof_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'AsOf User' });

        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Cuenta Histórica',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: '10000', // 100.00 DOP
            currentBalanceMinor: '60000'  // 600.00 DOP cache actual
        });

        const cat = await Category.create({ id: uuidv4(), userId, name: 'Salario', type: 'income' });

        // Movimiento en Enero (+200.00)
        const t1 = await sequelize.transaction();
        const tx1 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-01-15', type: 'income', status: 'cleared' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: acc.id, amountMinor: 20000, currency: 'DOP' }, { transaction: t1 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: null, categoryId: cat.id, amountMinor: -20000, currency: 'DOP' }, { transaction: t1 });
        await t1.commit();

        // Movimiento en Octubre (+300.00)
        const t2 = await sequelize.transaction();
        const tx2 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'income', status: 'cleared' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: acc.id, amountMinor: 30000, currency: 'DOP' }, { transaction: t2 });
        await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: null, categoryId: cat.id, amountMinor: -30000, currency: 'DOP' }, { transaction: t2 });
        await t2.commit();

        // Consulta asOf 2026-01-31: debe ser 100 + 200 = 300 DOP, no 600
        const { req, res, getData } = mockReqRes({
            user: { username: userId, role: 'user' },
            params: { id: acc.id },
            query: { asOf: '2026-01-31' }
        });

        await getAccountBalance(req, res);
        const balanceData = getData();

        assert.equal(balanceData.currentBalance, 300, 'Saldo histórico asOf 2026-01-31 debe ser 300');
        assert.equal(balanceData.currentBalanceMinor, '30000');
    });

    it('MEDIUM-03: transactionCount cuenta transacciones reales y no días del timeline', async () => {
        const userId = 'pg_m3_cnt_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Count User' });
        const acc = await Account.create({ id: uuidv4(), userId, name: 'Caja', type: 'cash', currency: 'DOP' });
        const cat = await Category.create({ id: uuidv4(), userId, name: 'Gasto', type: 'expense' });

        // Insertar 5 transacciones el mismo día (2026-10-04)
        for (let i = 0; i < 5; i++) {
            const t = await sequelize.transaction();
            const tx = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-04', type: 'expense', status: 'cleared' }, { transaction: t });
            await TransactionLine.create({ id: uuidv4(), transactionId: tx.id, accountId: acc.id, amountMinor: -1000, currency: 'DOP' }, { transaction: t });
            await TransactionLine.create({ id: uuidv4(), transactionId: tx.id, accountId: null, categoryId: cat.id, amountMinor: 1000, currency: 'DOP' }, { transaction: t });
            await t.commit();
        }

        const summaries = await LedgerReadService.getPeriodSummaries({ userId, year: 2026 });
        const octSummary = summaries.periods.find(s => s.period === '2026-10');

        assert.equal(octSummary.transactionCount, 5, 'Debe contar 5 transacciones y no 1 día');
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});

