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
    LedgerTransaction,
    TransactionLine,
    DailyTransaction,
    toMinorUnits,
    fromMinorUnits
} from '../../server/models/index.js';

import { LedgerReadService } from '../../server/services/ledgerReadService.js';

/**
 * Helper to atomically insert a transaction header and its balanced lines
 * within a single database transaction so the DEFERRED constraint trigger passes.
 */
async function insertBalancedTx({ id = uuidv4(), userId, date, type = 'income', lines }) {
    const t = await sequelize.transaction();
    try {
        const tx = await LedgerTransaction.create({
            id,
            userId,
            date,
            type,
            status: 'cleared'
        }, { transaction: t });

        await TransactionLine.bulkCreate(
            lines.map(line => ({
                id: line.id || uuidv4(),
                transactionId: tx.id,
                accountId: line.accountId || null,
                categoryId: line.categoryId || null,
                amountMinor: line.amountMinor,
                currency: line.currency || 'DOP'
            })),
            { transaction: t }
        );

        await t.commit();
        return tx;
    } catch (err) {
        await t.rollback().catch(() => {});
        throw err;
    }
}

describe('PostgreSQL Integration: LedgerReadService & Financial Pilot Read Models', () => {
    before(async () => {
        assertSafeTestEnvironment(TEST_DB_URL);
        await sequelize.authenticate();
        await initializeTestPostgres();
    });

    beforeEach(async () => {
        await sequelize.query('TRUNCATE TABLE transaction_lines, ledger_transactions, "DailyTransactions", accounts, categories, "Users" CASCADE;');
    });

    it('1. Balances: calcula saldo derivado directamente con SUM(amount_minor) en PostgreSQL', async () => {
        const userId = 'pg_user_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'PG User' });

        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Banco Principal',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 1000000, // 10,000 DOP
            currentBalanceMinor: 1500000  // 15,000 DOP cached
        });

        await insertBalancedTx({
            userId,
            date: '2026-10-04',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
                { amountMinor: -500000, currency: 'DOP' }
            ]
        });

        const balances = await LedgerReadService.getBalances({ userId });
        assert.equal(balances.accounts.length, 1);
        assert.equal(balances.accounts[0].currentBalanceMinor, '1500000');
        assert.equal(balances.accounts[0].derivedBalanceMinor, '1500000');
        assert.equal(balances.accounts[0].isReconciled, true);
        assert.equal(balances.totalBalance, 15000);
    });

    it('2. CashFlow: segrega flujos operativos y excluye transferencias internas en PostgreSQL', async () => {
        const userId = 'pg_user_cf_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'CF User' });

        const accA = await Account.create({ id: uuidv4(), userId, name: 'Caja', type: 'cash', currency: 'DOP' });
        const accB = await Account.create({ id: uuidv4(), userId, name: 'Banco', type: 'checking', currency: 'DOP' });

        // Income tx: +20,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-10-01',
            type: 'income',
            lines: [
                { accountId: accA.id, amountMinor: 2000000, currency: 'DOP' },
                { amountMinor: -2000000, currency: 'DOP' }
            ]
        });

        // Expense tx: -5,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-10-02',
            type: 'expense',
            lines: [
                { accountId: accA.id, amountMinor: -500000, currency: 'DOP' },
                { amountMinor: 500000, currency: 'DOP' }
            ]
        });

        // Transfer tx: 10,000 DOP from Caja to Banco
        await insertBalancedTx({
            userId,
            date: '2026-10-03',
            type: 'transfer',
            lines: [
                { accountId: accA.id, amountMinor: -1000000, currency: 'DOP' },
                { accountId: accB.id, amountMinor: 1000000, currency: 'DOP' }
            ]
        });

        const cashFlow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(cashFlow.totalIncome, 20000);
        assert.equal(cashFlow.totalExpense, 5000);
        assert.equal(cashFlow.netCashFlow, 15000); // 20k - 5k (transfer does NOT alter net cash flow)
        assert.equal(cashFlow.transactionCount, 2); // Internal transfers excluded from operating cash flow count
        assert.equal(cashFlow.timeline.length, 2); // 2 operating days
    });

    it('3. Period Summaries: agrupa métricas mensuales para el año en curso', async () => {
        const userId = 'pg_user_sum_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Summary User' });

        const acc = await Account.create({ id: uuidv4(), userId, name: 'Principal', type: 'checking', currency: 'DOP' });

        // Income in January: 60,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-01-15',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 6000000, currency: 'DOP' },
                { amountMinor: -6000000, currency: 'DOP' }
            ]
        });

        // Expense in January: 20,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-01-20',
            type: 'expense',
            lines: [
                { accountId: acc.id, amountMinor: -2000000, currency: 'DOP' },
                { amountMinor: 2000000, currency: 'DOP' }
            ]
        });

        const summaries = await LedgerReadService.getPeriodSummaries({ userId, year: 2026 });
        assert.equal(summaries.year, 2026);
        assert.equal(summaries.periods.length, 12);

        const jan = summaries.periods.find(p => p.period === '2026-01');
        assert.equal(jan.income, 60000);
        assert.equal(jan.expense, 20000);
        assert.equal(jan.net, 40000);
        assert.equal(jan.savingsRate, 67); // 40k / 60k = 66.6% -> 67%
    });

    it('4. Comparison Engine: detecta MIGRATION_GAP cuando DailyTransactions tiene registros no migrados', async () => {
        const userId = 'pg_gap_user_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Gap User' });
        const acc = await Account.create({ id: uuidv4(), userId, name: 'Caja', type: 'cash', currency: 'DOP' });

        // Migrated transaction: in both DailyTransactions and ledger
        await DailyTransaction.create({ userId, date: '2026-01-10', type: 'income', amount: 5000, description: 'Migrated' });
        await insertBalancedTx({
            userId,
            date: '2026-01-10',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
                { amountMinor: -500000, currency: 'DOP' }
            ]
        });

        // Unmigrated recent daily transaction: ONLY in DailyTransactions
        await DailyTransaction.create({ userId, date: '2026-10-02', type: 'expense', amount: 1500, description: 'Recent post-migration' });

        const comp = await LedgerReadService.compareLegacyVsLedger({ userId });
        assert.equal(comp.isIdentical, false);
        assert.equal(comp.classification, 'MIGRATION_GAP');
        assert.equal(comp.difference.countDiff, 1);
        assert.equal(comp.difference.expenseDiff, 1500);
    });

    it('5. NetWorth: respeta asOfDate excluyendo transacciones posteriores (HIGH-02)', async () => {
        const userId = 'pg_asof_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'AsOf User' });

        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Cuenta Ahorro',
            type: 'savings',
            currency: 'DOP',
            openingBalanceMinor: 100000 // 1,000 DOP opening
        });

        // Tx in January: +5,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-01-15',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
                { amountMinor: -500000, currency: 'DOP' }
            ]
        });

        // Tx in October: +10,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-10-01',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 1000000, currency: 'DOP' },
                { amountMinor: -1000000, currency: 'DOP' }
            ]
        });

        // Check NetWorth as of 2026-01-31 (should only include January tx + opening)
        const nwJan = await LedgerReadService.getNetWorth({ userId, asOfDate: '2026-01-31' });
        assert.equal(nwJan.netWorth, 6000); // 1,000 + 5,000 = 6,000 (NOT 16,000)

        // Check NetWorth current / as of 2026-10-31 (should include all)
        const nwOct = await LedgerReadService.getNetWorth({ userId, asOfDate: '2026-10-31' });
        assert.equal(nwOct.netWorth, 16000);
    });

    it('6. Fronteras temporales: no incluye transacciones del mes siguiente (HIGH-01)', async () => {
        const userId = 'pg_bound_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Bound User' });
        const acc = await Account.create({ id: uuidv4(), userId, name: 'Caja', type: 'cash', currency: 'DOP' });

        // Jan 31 transaction: +10,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-01-31',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 1000000, currency: 'DOP' },
                { amountMinor: -1000000, currency: 'DOP' }
            ]
        });

        // Feb 01 transaction: +5,000 DOP
        await insertBalancedTx({
            userId,
            date: '2026-02-01',
            type: 'income',
            lines: [
                { accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
                { amountMinor: -500000, currency: 'DOP' }
            ]
        });

        // Query January strictly [2026-01-01, 2026-01-31]
        const janFlow = await LedgerReadService.getCashFlow({
            userId,
            startDate: '2026-01-01',
            endDate: '2026-01-31'
        });

        assert.equal(janFlow.totalIncome, 10000);
        assert.equal(janFlow.transactionCount, 1);
    });

    it('7. Categorías y Splits: filtra por categoryIds y maneja múltiples líneas de split (MEDIUM-01)', async () => {
        const userId = 'pg_cat_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Cat User' });
        const acc = await Account.create({ id: uuidv4(), userId, name: 'Banco', type: 'checking', currency: 'DOP' });

        const catFood = await Category.create({ id: uuidv4(), userId, name: 'Alimentos', group: 'Necesidades', type: 'expense' });
        const catTransport = await Category.create({ id: uuidv4(), userId, name: 'Transporte', group: 'Necesidades', type: 'expense' });

        // Split expense: 100 DOP paid from bank (60 food, 40 transport)
        await insertBalancedTx({
            userId,
            date: '2026-10-04',
            type: 'expense',
            lines: [
                { accountId: acc.id, amountMinor: -10000, currency: 'DOP' },
                { categoryId: catFood.id, amountMinor: 6000, currency: 'DOP' },
                { categoryId: catTransport.id, amountMinor: 4000, currency: 'DOP' }
            ]
        });

        // Filter ONLY catFood
        const expensesFood = await LedgerReadService.getExpenses({
            userId,
            categoryIds: [catFood.id]
        });

        assert.equal(expensesFood.totalExpense, 60);
        assert.equal(expensesFood.items.length, 1);
        assert.equal(expensesFood.items[0].categoryName, 'Alimentos');

        // All categories
        const expensesAll = await LedgerReadService.getExpenses({ userId });
        assert.equal(expensesAll.totalExpense, 100);
        assert.equal(expensesAll.items.length, 2);
    });

    it('8. Inversiones: registra salida de efectivo en la cuenta y deduce de net cash flow (BLOCKER-04)', async () => {
        const userId = 'pg_inv_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Inv User' });
        const accCash = await Account.create({ id: uuidv4(), userId, name: 'Efectivo', type: 'cash', currency: 'DOP', openingBalanceMinor: 5000000 }); // 50k DOP

        const catInvest = await Category.create({ id: uuidv4(), userId, name: 'Bolsa', group: 'Inversiones', type: 'expense' });

        // Investment: 10,000 DOP committed from Cash
        await insertBalancedTx({
            userId,
            date: '2026-10-04',
            type: 'investment',
            lines: [
                { accountId: accCash.id, amountMinor: -1000000, currency: 'DOP' }, // Negative cash outflow
                { categoryId: catInvest.id, amountMinor: 1000000, currency: 'DOP' }
            ]
        });

        const balances = await LedgerReadService.getBalances({ userId });
        assert.equal(balances.accounts[0].derivedBalance, 40000); // 50,000 - 10,000 = 40,000

        const flow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(flow.totalInvested, 10000);
        assert.equal(flow.netCashFlow, -10000);
    });

    it('9. BIGINT precision > 2^53 - 1 (9007199254740993 minor units) exact decimal string (HIGH-03)', async () => {
        const userId = 'pg_bigint_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'BigInt User' });

        const hugeAmount = '9007199254740993';
        const acc = await Account.create({
            id: uuidv4(),
            userId,
            name: 'Sovereign Treasury',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: hugeAmount,
            currentBalanceMinor: hugeAmount
        });

        const balances = await LedgerReadService.getBalances({ userId });
        assert.equal(balances.accounts[0].derivedBalanceMinor, hugeAmount);
        // Exceeds 2^53 - 1: returns exact string representation without losing the 3 at the end
        assert.equal(balances.accounts[0].derivedBalance, '90071992547409.93');
    });

    it('10. Ownership: getCashFlow aísla cuentas de otro usuario y trigger rechaza líneas ajenas (HIGH-04)', async () => {
        const userA = 'pg_own_a_' + uuidv4().slice(0, 8);
        const userB = 'pg_own_b_' + uuidv4().slice(0, 8);
        await User.bulkCreate([
            { username: userA, password: 'x', name: 'User A' },
            { username: userB, password: 'x', name: 'User B' }
        ]);

        const accB = await Account.create({ id: uuidv4(), userId: userB, name: 'Cuenta B', type: 'checking', currency: 'DOP' });

        // Manually craft transaction under userA pointing to account of userB inside a transaction
        const t = await sequelize.transaction();
        let blockedByTrigger = false;
        try {
            const txId = uuidv4();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', '${userA}', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: t });
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accB.id}', 77700, 'DOP', NOW(), NOW());
            `, { transaction: t });
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -77700, 'DOP', NOW(), NOW());
            `, { transaction: t });
            await t.commit();
        } catch (err) {
            blockedByTrigger = true;
            await t.rollback().catch(() => {});
            assert.match(err.message, /different user/);
        }
        assert.equal(blockedByTrigger, true, 'Trigger must block transaction with cross-user account');

        // Even if querying userA, getCashFlow strictly inner-joins account.user_id === userA
        const flowA = await LedgerReadService.getCashFlow({ userId: userA });
        assert.equal(flowA.totalIncome, 0);
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});
