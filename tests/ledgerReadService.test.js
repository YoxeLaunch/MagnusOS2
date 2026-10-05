import test from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';

process.env.NODE_ENV = 'test';

import {
    initDb,
    sequelize,
    User,
    Account,
    Category,
    LedgerTransaction,
    TransactionLine,
    DailyTransaction,
    toMinorUnits,
    fromMinorUnits
} from '../server/models/index.js';

import { LedgerReadService } from '../server/services/ledgerReadService.js';

test.before(async () => {
    await initDb();
});

test.beforeEach(async () => {
    await TransactionLine.destroy({ where: {}, force: true });
    await LedgerTransaction.destroy({ where: {}, force: true });
    await DailyTransaction.destroy({ where: {}, force: true });
    await Account.destroy({ where: {}, force: true });
    await Category.destroy({ where: {}, force: true });
});

test('LEDGER READ SERVICE: 1. Empty ledger returns normalized zero balances and empty arrays', async () => {
    const userId = 'user_empty_' + uuidv4().slice(0, 8);

    const balances = await LedgerReadService.getBalances({ userId });
    assert.equal(balances.accounts.length, 0);
    assert.equal(balances.totalBalance, 0);
    assert.equal(balances.isAllReconciled, true);

    const cashFlow = await LedgerReadService.getCashFlow({ userId });
    assert.equal(cashFlow.totalIncome, 0);
    assert.equal(cashFlow.totalExpense, 0);
    assert.equal(cashFlow.netCashFlow, 0);
    assert.equal(cashFlow.transactionCount, 0);
    assert.deepEqual(cashFlow.timeline, []);

    const netWorth = await LedgerReadService.getNetWorth({ userId });
    assert.equal(netWorth.netWorth, 0);
    assert.equal(netWorth.assets, 0);
    assert.equal(netWorth.liabilities, 0);
});

test('LEDGER READ SERVICE: 2. Income only transaction creates positive cash flow and zero expense', async () => {
    const userId = 'user_income_' + uuidv4().slice(0, 8);

    const account = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Cuenta Nómina',
        type: 'checking',
        currency: 'DOP',
        openingBalanceMinor: 0,
        currentBalanceMinor: 5000000 // 50,000 DOP
    });

    const category = await Category.create({
        id: uuidv4(),
        userId,
        name: 'Salario',
        group: 'Ingresos',
        type: 'income'
    });

    const tx = await LedgerTransaction.create({
        id: uuidv4(),
        userId,
        date: '2026-10-01',
        type: 'income',
        status: 'cleared',
        memo: 'Sueldo'
    });

    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        accountId: account.id,
        amountMinor: 5000000,
        currency: 'DOP'
    });

    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        categoryId: category.id,
        amountMinor: -5000000,
        currency: 'DOP'
    });

    const cashFlow = await LedgerReadService.getCashFlow({ userId });
    assert.equal(cashFlow.totalIncome, 50000);
    assert.equal(cashFlow.totalExpense, 0);
    assert.equal(cashFlow.netCashFlow, 50000);
    assert.equal(cashFlow.transactionCount, 1);

    const balances = await LedgerReadService.getBalances({ userId });
    assert.equal(balances.accounts.length, 1);
    assert.equal(balances.accounts[0].currentBalance, 50000);
    assert.equal(balances.accounts[0].derivedBalance, 50000);
    assert.equal(balances.accounts[0].isReconciled, true);
});

test('LEDGER READ SERVICE: 3. Expense only transaction creates positive expense and negative net cash flow', async () => {
    const userId = 'user_expense_' + uuidv4().slice(0, 8);

    const account = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Efectivo',
        type: 'cash',
        currency: 'DOP',
        openingBalanceMinor: 1000000, // 10,000 DOP
        currentBalanceMinor: 750000  // 7,500 DOP
    });

    const category = await Category.create({
        id: uuidv4(),
        userId,
        name: 'Supermercado',
        group: 'Alimentación',
        type: 'expense'
    });

    const tx = await LedgerTransaction.create({
        id: uuidv4(),
        userId,
        date: '2026-10-02',
        type: 'expense',
        status: 'cleared',
        memo: 'Compra mensual'
    });

    // Money leaves account: negative amountMinor
    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        accountId: account.id,
        amountMinor: -250000,
        currency: 'DOP'
    });

    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        categoryId: category.id,
        amountMinor: 250000,
        currency: 'DOP'
    });

    const cashFlow = await LedgerReadService.getCashFlow({ userId });
    assert.equal(cashFlow.totalIncome, 0);
    assert.equal(cashFlow.totalExpense, 2500);
    assert.equal(cashFlow.netCashFlow, -2500);

    const expenses = await LedgerReadService.getExpenses({ userId });
    assert.equal(expenses.totalExpense, 2500);
    assert.equal(expenses.items.length, 1);
    assert.equal(expenses.categories[0].categoryName, 'Supermercado');
    assert.equal(expenses.categories[0].total, 2500);
});

test('LEDGER READ SERVICE: 4. Transfer between accounts has 0 net cash flow impact', async () => {
    const userId = 'user_transfer_' + uuidv4().slice(0, 8);

    const accA = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Cuenta Corriente',
        type: 'checking',
        currency: 'DOP',
        openingBalanceMinor: 0,
        currentBalanceMinor: 200000
    });

    const accB = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Fondo de Emergencia',
        type: 'savings',
        currency: 'DOP',
        openingBalanceMinor: 0,
        currentBalanceMinor: 300000
    });

    const tx = await LedgerTransaction.create({
        id: uuidv4(),
        userId,
        date: '2026-10-03',
        type: 'transfer',
        status: 'cleared',
        memo: 'Ahorro'
    });

    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        accountId: accA.id,
        amountMinor: -100000, // -1,000 DOP
        currency: 'DOP'
    });

    await TransactionLine.create({
        id: uuidv4(),
        transactionId: tx.id,
        accountId: accB.id,
        amountMinor: 100000, // +1,000 DOP
        currency: 'DOP'
    });

    const cashFlow = await LedgerReadService.getCashFlow({ userId });
    // Transfers are asset reallocations: 0 income, 0 expense, 0 net cash flow
    assert.equal(cashFlow.totalIncome, 0);
    assert.equal(cashFlow.totalExpense, 0);
    assert.equal(cashFlow.netCashFlow, 0);
});

test('LEDGER READ SERVICE: 5. Multiple accounts correctly aggregate balances and net worth', async () => {
    const userId = 'user_multi_' + uuidv4().slice(0, 8);

    await Account.create({
        id: uuidv4(),
        userId,
        name: 'Checking',
        type: 'checking',
        currency: 'DOP',
        openingBalanceMinor: 1000000,
        currentBalanceMinor: 1000000 // 10,000 DOP
    });

    await Account.create({
        id: uuidv4(),
        userId,
        name: 'Savings',
        type: 'savings',
        currency: 'DOP',
        openingBalanceMinor: 2500000,
        currentBalanceMinor: 2500000 // 25,000 DOP
    });

    await Account.create({
        id: uuidv4(),
        userId,
        name: 'Credit Card',
        type: 'credit_card',
        currency: 'DOP',
        openingBalanceMinor: -500000,
        currentBalanceMinor: -500000 // -5,000 DOP
    });

    const balances = await LedgerReadService.getBalances({ userId });
    assert.equal(balances.accounts.length, 3);
    assert.equal(balances.totalBalance, 30000); // 10k + 25k - 5k = 30k

    const netWorth = await LedgerReadService.getNetWorth({ userId });
    assert.equal(netWorth.assets, 35000); // 10k + 25k
    assert.equal(netWorth.liabilities, 5000); // 5k
    assert.equal(netWorth.netWorth, 30000); // 35k - 5k
});

test('LEDGER READ SERVICE: 6. Date ranges filter transactions accurately', async () => {
    const userId = 'user_dates_' + uuidv4().slice(0, 8);

    const acc = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Cuenta',
        type: 'checking',
        currency: 'DOP',
        openingBalanceMinor: 0,
        currentBalanceMinor: 300000
    });

    // Sep 15
    const tx1 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-09-15', type: 'income' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: acc.id, amountMinor: 100000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, amountMinor: -100000, currency: 'DOP' });

    // Oct 05
    const tx2 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-05', type: 'income' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: acc.id, amountMinor: 200000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, amountMinor: -200000, currency: 'DOP' });

    // Filter only October
    const octFlow = await LedgerReadService.getCashFlow({
        userId,
        startDate: '2026-10-01',
        endDate: '2026-10-31'
    });
    assert.equal(octFlow.totalIncome, 2000);
    assert.equal(octFlow.transactionCount, 1);

    // Full range
    const allFlow = await LedgerReadService.getCashFlow({
        userId,
        startDate: '2026-09-01',
        endDate: '2026-10-31'
    });
    assert.equal(allFlow.totalIncome, 3000);
    assert.equal(allFlow.transactionCount, 2);
});

test('LEDGER READ SERVICE: 7. Category Totals accurately groups and orders categories', async () => {
    const userId = 'user_cats_' + uuidv4().slice(0, 8);

    const acc = await Account.create({ id: uuidv4(), userId, name: 'C', type: 'checking', currency: 'DOP' });
    const catFood = await Category.create({ id: uuidv4(), userId, name: 'Comida', group: 'Alimentación', type: 'expense' });
    const catTech = await Category.create({ id: uuidv4(), userId, name: 'Tecnología', group: 'Deseos', type: 'expense' });

    const txFood = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'expense' });
    await TransactionLine.create({ id: uuidv4(), transactionId: txFood.id, accountId: acc.id, amountMinor: -300000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: txFood.id, categoryId: catFood.id, amountMinor: 300000, currency: 'DOP' });

    const txTech = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-02', type: 'expense' });
    await TransactionLine.create({ id: uuidv4(), transactionId: txTech.id, accountId: acc.id, amountMinor: -500000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: txTech.id, categoryId: catTech.id, amountMinor: 500000, currency: 'DOP' });

    const totals = await LedgerReadService.getCategoryTotals({ userId, type: 'expense' });
    assert.equal(totals.length, 2);
    // Highest first: Tecnología (5,000) then Comida (3,000)
    assert.equal(totals[0].name, 'Tecnología');
    assert.equal(totals[0].total, 5000);
    assert.equal(totals[1].name, 'Comida');
    assert.equal(totals[1].total, 3000);
});

test('LEDGER READ SERVICE: 8. Large BIGINT amounts (> 2^31 cents) calculated without precision loss', async () => {
    const userId = 'user_bigint_' + uuidv4().slice(0, 8);
    // 50 billion cents = 500,000,000.00 DOP (> 2^31 - 1 = 2,147,483,647)
    const largeMinor = '50000000000';

    const acc = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Fondo Soberano',
        type: 'investment',
        currency: 'DOP',
        openingBalanceMinor: largeMinor,
        currentBalanceMinor: largeMinor
    });

    const balances = await LedgerReadService.getBalances({ userId });
    assert.equal(balances.accounts[0].currentBalanceMinor, largeMinor);
    assert.equal(balances.accounts[0].currentBalance, 500000000);
    assert.equal(balances.totalBalance, 500000000);
});

test('LEDGER READ SERVICE: 9. compareLegacyVsLedger detects EXACT_MATCH when identical', async () => {
    const userId = 'user_comp_' + uuidv4().slice(0, 8);

    await User.create({
        username: userId,
        password: 'hash_placeholder',
        name: 'Test Compare User'
    });

    const acc = await Account.create({
        id: uuidv4(),
        userId,
        name: 'Efectivo',
        type: 'cash',
        currency: 'DOP'
    });

    // Legacy DailyTransaction: Income 1,000, Expense 400
    await DailyTransaction.create({
        userId,
        date: '2026-10-01',
        type: 'income',
        amount: 1000,
        description: 'Venta'
    });

    await DailyTransaction.create({
        userId,
        date: '2026-10-02',
        type: 'expense',
        amount: 400,
        description: 'Cena'
    });

    // Ledger Transactions: exactly same amounts
    const tx1 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-01', type: 'income' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, accountId: acc.id, amountMinor: 100000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx1.id, amountMinor: -100000, currency: 'DOP' });

    const tx2 = await LedgerTransaction.create({ id: uuidv4(), userId, date: '2026-10-02', type: 'expense' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, accountId: acc.id, amountMinor: -40000, currency: 'DOP' });
    await TransactionLine.create({ id: uuidv4(), transactionId: tx2.id, amountMinor: 40000, currency: 'DOP' });

    const comp = await LedgerReadService.compareLegacyVsLedger({ userId });
    assert.equal(comp.isIdentical, true);
    assert.equal(comp.classification, 'EXACT_MATCH');
    assert.equal(comp.legacy.income, 1000);
    assert.equal(comp.ledger.income, 1000);
    assert.equal(comp.legacy.expense, 400);
    assert.equal(comp.ledger.expense, 400);
    assert.equal(comp.difference.incomeDiff, 0);
    assert.equal(comp.difference.expenseDiff, 0);
    assert.equal(comp.difference.netDiff, 0);
});
