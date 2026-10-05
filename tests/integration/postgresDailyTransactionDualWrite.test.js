import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestPostgres } from './setupTestDb.js';
import {
    sequelize,
    User,
    DailyTransaction,
    LedgerTransaction,
    TransactionLine,
    Account
} from '../../server/models/index.js';
import { createDailyTransaction, updateDailyTransaction } from '../../server/controllers/finanzaController.js';

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    send(body) { this.body = body; return body; }
});

describe('PostgreSQL DailyTransaction compatibility dual-write', () => {
    const userId = 'daily_dual_write_audit_user';

    before(async () => {
        await initializeTestPostgres();
        await User.findOrCreate({
            where: { username: userId },
            defaults: { username: userId, password: 'test', role: 'user' }
        });
    });

    it('updates legacy projection, Ledger lines, and cached account balance atomically', async () => {
        const createRes = response();
        await createDailyTransaction({
            user: { username: userId, role: 'user' },
            body: {
                date: '2026-10-04', amount: '100.00', amountMinor: '10000',
                description: 'Original expense', type: 'expense', category: 'Audit', currency: 'DOP'
            }
        }, createRes);
        assert.equal(createRes.statusCode, 201);

        const daily = await DailyTransaction.findOne({ where: { userId }, order: [['id', 'DESC']] });
        const updateRes = response();
        await updateDailyTransaction({
            user: { username: userId, role: 'user' },
            params: { id: String(daily.id) },
            body: {
                amount: '999.00', amountMinor: '99900', description: 'Corrected income',
                type: 'income', category: 'Correction'
            }
        }, updateRes);
        assert.equal(updateRes.statusCode, 200);

        await daily.reload();
        const ledger = await LedgerTransaction.findOne({ where: { userId, reference: `migrated:daily:${daily.id}` } });
        const lines = await TransactionLine.findAll({ where: { transactionId: ledger.id } });
        const accountLine = lines.find(line => line.accountId);
        const account = await Account.findByPk(accountLine.accountId);

        assert.equal(String(daily.amountMinor), '99900');
        assert.equal(daily.type, 'income');
        assert.equal(ledger.type, 'income');
        assert.deepEqual(lines.map(line => String(line.amountMinor)).sort(), ['-99900', '99900']);
        assert.equal(String(account.currentBalanceMinor), '99900');
    });

    after(async () => {
        await sequelize.close();
    });
});
