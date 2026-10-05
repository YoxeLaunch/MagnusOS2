import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestPostgres, TEST_DB_URL, sequelize } from './setupTestDb.js';
import {
    Account,
    Category,
    LedgerTransaction,
    TransactionLine,
    User,
    sequelize as db
} from '../../server/models/index.js';
import { LedgerAnalyticsService } from '../../server/services/ledgerAnalyticsService.js';
import { createTransaction } from '../../server/controllers/ledgerController.js';

describe('PostgreSQL LedgerAnalyticsService & Consumer Unification (Phase II Remediation)', () => {
    const userA = 'user_analytics_a';
    const userB = 'user_analytics_b';

    let accountA;
    let accountB;
    let categoryWork;
    let categoryFood;

    before(async () => {
        await initializeTestPostgres();

        await User.findOrCreate({
            where: { username: userA },
            defaults: { username: userA, password: 'password', role: 'user' }
        });
        await User.findOrCreate({
            where: { username: userB },
            defaults: { username: userB, password: 'password', role: 'user' }
        });
    });

    beforeEach(async () => {
        // Clean ledger tables for these test users
        await db.query(`DELETE FROM transaction_lines WHERE transaction_id IN (SELECT id FROM ledger_transactions WHERE user_id IN ($1, $2));`, { bind: [userA, userB] }).catch(() => {});
        await db.query(`DELETE FROM ledger_transactions WHERE user_id IN ($1, $2);`, { bind: [userA, userB] }).catch(() => {});
        await db.query(`DELETE FROM accounts WHERE user_id IN ($1, $2);`, { bind: [userA, userB] }).catch(() => {});
        await db.query(`DELETE FROM categories WHERE user_id IN ($1, $2);`, { bind: [userA, userB] }).catch(() => {});

        accountA = await Account.create({
            userId: userA,
            name: 'Checking A',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 5000000n, // 50,000.00
            currentBalanceMinor: 5000000n
        });

        accountB = await Account.create({
            userId: userB,
            name: 'Checking B',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 1000000n,
            currentBalanceMinor: 1000000n
        });

        categoryWork = await Category.create({
            userId: userA,
            name: 'Trabajo',
            type: 'income'
        });

        categoryFood = await Category.create({
            userId: userA,
            name: 'Comida',
            type: 'expense'
        });

        // Insert double-entry ledger transactions for userA atomically
        const t = await db.transaction();
        try {
            // Tx 1: Income 15,000.00 DOP on 2026-03-05
            const [tx1] = await db.query(`
                INSERT INTO ledger_transactions (id, user_id, date, type, status, memo, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, '2026-03-05', 'income', 'cleared', 'Cobro nómina', NOW(), NOW())
                RETURNING id;
            `, { bind: [userA], transaction: t });
            const tx1Id = tx1[0].id;

            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, 1500000, 'DOP', NOW(), NOW());
            `, { bind: [tx1Id, accountA.id], transaction: t });

            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, category_id, amount_minor, currency, memo, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, -1500000, 'DOP', 'Trabajo', NOW(), NOW());
            `, { bind: [tx1Id, categoryWork.id], transaction: t });

            // Tx 2: Expense 2,500.00 DOP on 2026-03-10
            const [tx2] = await db.query(`
                INSERT INTO ledger_transactions (id, user_id, date, type, status, memo, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, '2026-03-10', 'expense', 'cleared', 'Cena familiar', NOW(), NOW())
                RETURNING id;
            `, { bind: [userA], transaction: t });
            const tx2Id = tx2[0].id;

            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, -250000, 'DOP', NOW(), NOW());
            `, { bind: [tx2Id, accountA.id], transaction: t });

            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, category_id, amount_minor, currency, memo, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, 250000, 'DOP', 'Comida', NOW(), NOW());
            `, { bind: [tx2Id, categoryFood.id], transaction: t });

            // Update cached balance
            await db.query(`
                UPDATE accounts SET current_balance_minor = current_balance_minor + 1500000 - 250000 WHERE id = $1;
            `, { bind: [accountA.id], transaction: t });

            await t.commit();
        } catch (e) {
            await t.rollback().catch(() => {});
            throw e;
        }
    });

    it('1. getNormalizedTimeline: extrae transacciones 100% respaldadas por partida doble en ledger', async () => {
        const timeline = await LedgerAnalyticsService.getNormalizedTimeline({ userId: userA });
        assert.equal(timeline.length, 2);

        const incomeTx = timeline.find(t => t.type === 'income');
        assert.ok(incomeTx);
        assert.equal(incomeTx.amount, 15000);
        assert.equal(incomeTx.amountMinor, '1500000');
        assert.equal(incomeTx.date, '2026-03-05');
        assert.equal(incomeTx.category, 'Trabajo');

        const expenseTx = timeline.find(t => t.type === 'expense');
        assert.ok(expenseTx);
        assert.equal(expenseTx.amount, 2500);
        assert.equal(expenseTx.amountMinor, '250000');
        assert.equal(expenseTx.date, '2026-03-10');
        assert.equal(expenseTx.category, 'Comida');
    });

    it('2. getEconometricsDataset: calcula series estadísticas directamente desde el ledger', async () => {
        const dataset = await LedgerAnalyticsService.getEconometricsDataset({ userId: userA });

        // Expected balance: 50,000 opening + 15,000 - 2,500 = 62,500
        assert.equal(dataset.currentBalance, 62500);
        assert.equal(dataset.totalTransactions, 2);

        // Daily flows
        assert.equal(dataset.dailyFlows.length, 2);
        const day1 = dataset.dailyFlows.find(d => d.date === '2026-03-05');
        assert.equal(day1.netFlow, 15000);
        const day2 = dataset.dailyFlows.find(d => d.date === '2026-03-10');
        assert.equal(day2.netFlow, -2500);

        // Monthly data
        assert.equal(dataset.monthlyData.length, 1);
        assert.equal(dataset.monthlyData[0].month, '2026-03');
        assert.equal(dataset.monthlyData[0].income, 15000);
        assert.equal(dataset.monthlyData[0].expense, 2500);

        // Category expenses
        assert.equal(dataset.categoryExpenses.length, 1);
        assert.equal(dataset.categoryExpenses[0].category, 'Comida');
        assert.equal(dataset.categoryExpenses[0].amount, 2500);
    });

    it('3. getTelegramSummary: reporta balance y flujos oficiales sin mezclar modelos de presupuesto', async () => {
        const summary = await LedgerAnalyticsService.getTelegramSummary({ userId: userA });

        assert.equal(summary.balance, 62500);
        assert.equal(summary.totalIncome, 15000);
        assert.equal(summary.totalExpenses, 2500);
        assert.equal(summary.netCashFlow, 12500);
        assert.equal(summary.accountCount, 1);
        assert.equal(summary.transactionCount, 2);
    });

    it('4. Multi-tenant isolation: Usuario B no ve transacciones ni balances de Usuario A', async () => {
        const timelineB = await LedgerAnalyticsService.getNormalizedTimeline({ userId: userB });
        assert.equal(timelineB.length, 0);

        const datasetB = await LedgerAnalyticsService.getEconometricsDataset({ userId: userB });
        assert.equal(datasetB.currentBalance, 10000); // 10,000.00 DOP opening balance
        assert.equal(datasetB.totalTransactions, 0);
        assert.equal(datasetB.dailyFlows.length, 0);
        assert.equal(datasetB.monthlyData.length, 0);

        const summaryB = await LedgerAnalyticsService.getTelegramSummary({ userId: userB });
        assert.equal(summaryB.balance, 10000);
        assert.equal(summaryB.totalIncome, 0);
        assert.equal(summaryB.totalExpenses, 0);
        assert.equal(summaryB.transactionCount, 0);
    });

    it('5. Currency filter never aggregates USD minor units into a DOP econometrics dataset', async () => {
        const usdAccount = await Account.create({
            userId: userA, name: 'USD A', type: 'checking', currency: 'USD',
            openingBalanceMinor: 0n, currentBalanceMinor: 0n
        });
        const usdCategory = await Category.create({ userId: userA, name: 'USD income', type: 'income' });
        const tx = await db.transaction();
        try {
            const [header] = await db.query(`
                INSERT INTO ledger_transactions (id, user_id, date, type, status, memo, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, '2026-03-11', 'income', 'cleared', 'USD deposit', NOW(), NOW())
                RETURNING id;
            `, { bind: [userA], transaction: tx });
            await db.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, category_id, amount_minor, currency, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, NULL, 10000, 'USD', NOW(), NOW()),
                       (gen_random_uuid(), $1, NULL, $3, -10000, 'USD', NOW(), NOW());
            `, { bind: [header[0].id, usdAccount.id, usdCategory.id], transaction: tx });
            await tx.commit();
        } catch (error) {
            await tx.rollback().catch(() => {});
            throw error;
        }

        const dopTimeline = await LedgerAnalyticsService.getNormalizedTimeline({ userId: userA, currency: 'DOP' });
        const dataset = await LedgerAnalyticsService.getEconometricsDataset({ userId: userA, currency: 'DOP' });

        assert.equal(dopTimeline.length, 2);
        assert.equal(dataset.totalTransactions, 2);
        assert.equal(dataset.monthlyData[0].income, 15000);
    });

    after(async () => {
        try {
            await db.close();
        } catch (_) {}
    });
});
