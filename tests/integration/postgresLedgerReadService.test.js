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

        const tx = await LedgerTransaction.create({
            id: uuidv4(),
            userId,
            date: '2026-10-04',
            type: 'income',
            status: 'cleared'
        });

        // Insert balancing lines atomically via bulkCreate
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: tx.id, accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
            { id: uuidv4(), transactionId: tx.id, amountMinor: -500000, currency: 'DOP' }
        ]);

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
        const txInc = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'income' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: txInc.id, accountId: accA.id, amountMinor: 2000000, currency: 'DOP' },
            { id: uuidv4(), transactionId: txInc.id, amountMinor: -2000000, currency: 'DOP' }
        ]);

        // Expense tx: -5,000 DOP
        const txExp = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-02', type: 'expense' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: txExp.id, accountId: accA.id, amountMinor: -500000, currency: 'DOP' },
            { id: uuidv4(), transactionId: txExp.id, amountMinor: 500000, currency: 'DOP' }
        ]);

        // Transfer tx: 10,000 DOP from Caja to Banco
        const txTrf = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-03', type: 'transfer' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: txTrf.id, accountId: accA.id, amountMinor: -1000000, currency: 'DOP' },
            { id: uuidv4(), transactionId: txTrf.id, accountId: accB.id, amountMinor: 1000000, currency: 'DOP' }
        ]);

        const cashFlow = await LedgerReadService.getCashFlow({ userId });
        assert.equal(cashFlow.totalIncome, 20000);
        assert.equal(cashFlow.totalExpense, 5000);
        assert.equal(cashFlow.netCashFlow, 15000); // 20k - 5k (transfer does NOT alter net cash flow)
        assert.equal(cashFlow.transactionCount, 3);
        assert.equal(cashFlow.timeline.length, 2); // 2 operating days
    });

    it('3. Period Summaries: agrupa métricas mensuales para el año en curso', async () => {
        const userId = 'pg_user_sum_' + uuidv4().slice(0, 8);
        await User.create({ username: userId, password: 'x', name: 'Summary User' });

        const acc = await Account.create({ id: uuidv4(), userId, name: 'Principal', type: 'checking', currency: 'DOP' });

        // Income in January: 60,000 DOP
        const txJan = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-01-15', type: 'income' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: txJan.id, accountId: acc.id, amountMinor: 6000000, currency: 'DOP' },
            { id: uuidv4(), transactionId: txJan.id, amountMinor: -6000000, currency: 'DOP' }
        ]);

        // Expense in January: 20,000 DOP
        const txJanExp = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-01-20', type: 'expense' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: txJanExp.id, accountId: acc.id, amountMinor: -2000000, currency: 'DOP' },
            { id: uuidv4(), transactionId: txJanExp.id, amountMinor: 2000000, currency: 'DOP' }
        ]);

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
        const tx = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-01-10', type: 'income' });
        await TransactionLine.bulkCreate([
            { id: uuidv4(), transactionId: tx.id, accountId: acc.id, amountMinor: 500000, currency: 'DOP' },
            { id: uuidv4(), transactionId: tx.id, amountMinor: -500000, currency: 'DOP' }
        ]);

        // Unmigrated recent daily transaction: ONLY in DailyTransactions
        await DailyTransaction.create({ userId, date: '2026-10-02', type: 'expense', amount: 1500, description: 'Recent post-migration' });

        const comp = await LedgerReadService.compareLegacyVsLedger({ userId });
        assert.equal(comp.isIdentical, false);
        assert.equal(comp.classification, 'MIGRATION_GAP');
        assert.equal(comp.difference.countDiff, 1);
        assert.equal(comp.difference.expenseDiff, 1500);
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});
