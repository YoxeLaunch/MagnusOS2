import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestPostgres, TEST_DB_URL, sequelize } from './setupTestDb.js';
import {
    Account,
    LedgerTransaction,
    TransactionLine,
    User,
    sequelize as db
} from '../../server/models/index.js';
import {
    createTransaction,
    createTransfer
} from '../../server/controllers/ledgerController.js';

describe('PostgreSQL Multicurrency Invariants & Isolation (Phase II Remediation)', () => {
    let userA = 'user_multi_a';
    let userB = 'user_multi_b';

    let accountDopA;
    let accountUsdA;
    let accountEurA;
    let accountDopB;

    before(async () => {
        await initializeTestPostgres();

        // Seed users
        await User.findOrCreate({
            where: { username: userA },
            defaults: { username: userA, password: 'password123', role: 'user' }
        });
        await User.findOrCreate({
            where: { username: userB },
            defaults: { username: userB, password: 'password123', role: 'user' }
        });

        // Seed accounts
        accountDopA = await Account.create({
            userId: userA,
            name: 'A DOP Checking',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 10000000n, // 100,000.00 DOP
            currentBalanceMinor: 10000000n
        });

        accountUsdA = await Account.create({
            userId: userA,
            name: 'A USD Savings',
            type: 'savings',
            currency: 'USD',
            openingBalanceMinor: 500000n, // 5,000.00 USD
            currentBalanceMinor: 500000n
        });

        accountEurA = await Account.create({
            userId: userA,
            name: 'A EUR Cash',
            type: 'cash',
            currency: 'EUR',
            openingBalanceMinor: 300000n, // 3,000.00 EUR
            currentBalanceMinor: 300000n
        });

        accountDopB = await Account.create({
            userId: userB,
            name: 'B DOP Checking',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 5000000n, // 50,000.00 DOP
            currentBalanceMinor: 5000000n
        });
    });

    const createMockRes = () => {
        const res = {
            statusCode: 200,
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(payload) {
                this.body = payload;
                return this;
            },
            send(payload) {
                this.body = payload;
                return this;
            }
        };
        return res;
    };

    it('1. DOP -> DOP: transferencia monomoneda exitosa actualiza saldos', async () => {
        const targetDopA = await Account.create({
            userId: userA,
            name: 'A DOP Savings',
            type: 'savings',
            currency: 'DOP',
            openingBalanceMinor: 0n,
            currentBalanceMinor: 0n
        });

        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                fromAccountId: accountDopA.id,
                toAccountId: targetDopA.id,
                amount: '1500.50',
                memo: 'Transferencia DOP'
            }
        };
        const res = createMockRes();

        await createTransfer(req, res);
        assert.ok(res.statusCode === 200 || res.statusCode === 201);

        const refreshedFrom = await Account.findByPk(accountDopA.id);
        const refreshedTo = await Account.findByPk(targetDopA.id);

        assert.equal(refreshedFrom.currentBalanceMinor.toString(), '9849950'); // 100,000 - 1,500.50
        assert.equal(refreshedTo.currentBalanceMinor.toString(), '150050');
    });

    it('2. USD -> USD: transferencia monomoneda en USD exitosa', async () => {
        const targetUsdA = await Account.create({
            userId: userA,
            name: 'A USD Investment',
            type: 'investment',
            currency: 'USD',
            openingBalanceMinor: 0n,
            currentBalanceMinor: 0n
        });

        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                fromAccountId: accountUsdA.id,
                toAccountId: targetUsdA.id,
                amount: '250.00',
                memo: 'USD Transfer'
            }
        };
        const res = createMockRes();

        await createTransfer(req, res);
        assert.ok(res.statusCode === 200 || res.statusCode === 201);

        const refreshedFrom = await Account.findByPk(accountUsdA.id);
        const refreshedTo = await Account.findByPk(targetUsdA.id);

        assert.equal(refreshedFrom.currentBalanceMinor.toString(), '475000');
        assert.equal(refreshedTo.currentBalanceMinor.toString(), '25000');
    });

    it('3. EUR -> EUR: transferencia monomoneda en EUR exitosa', async () => {
        const targetEurA = await Account.create({
            userId: userA,
            name: 'A EUR Bank',
            type: 'checking',
            currency: 'EUR',
            openingBalanceMinor: 0n,
            currentBalanceMinor: 0n
        });

        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                fromAccountId: accountEurA.id,
                toAccountId: targetEurA.id,
                amount: '100.00',
                memo: 'EUR Transfer'
            }
        };
        const res = createMockRes();

        await createTransfer(req, res);
        assert.ok(res.statusCode === 200 || res.statusCode === 201);

        const refreshedFrom = await Account.findByPk(accountEurA.id);
        const refreshedTo = await Account.findByPk(targetEurA.id);

        assert.equal(refreshedFrom.currentBalanceMinor.toString(), '290000');
        assert.equal(refreshedTo.currentBalanceMinor.toString(), '10000');
    });

    it('4. DOP -> USD: transferencia directa entre monedas distintas es RECHAZADA', async () => {
        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                fromAccountId: accountDopA.id,
                toAccountId: accountUsdA.id,
                amount: '500.00'
            }
        };
        const res = createMockRes();

        await createTransfer(req, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /misma moneda/i);
    });

    it('5. POST /api/finanza/ledger/transactions: rechaza línea con currency distinta a cuenta', async () => {
        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Adversarial line currency mismatch',
                lines: [
                    { accountId: accountDopA.id, amountMinor: '10000', currency: 'USD' },
                    { accountId: accountDopA.id, amountMinor: '-10000', currency: 'USD' }
                ]
            }
        };
        const res = createMockRes();

        await createTransaction(req, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /no coincide con la moneda de la cuenta/i);
    });

    it('6. POST /api/finanza/ledger/transactions: rechaza suma escalar cero si mezcla monedas', async () => {
        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Adversarial cross-currency sum=0',
                lines: [
                    { accountId: accountUsdA.id, amountMinor: '10000', currency: 'USD' },
                    { accountId: accountDopA.id, amountMinor: '-10000', currency: 'DOP' }
                ]
            }
        };
        const res = createMockRes();

        await createTransaction(req, res);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error, /multimoneda no permitidas|una sola moneda/i);
    });

    it('7. SQL DIRECTO RECHAZADO: row-level trigger rechaza tl.currency <> a.currency', async () => {
        await assert.rejects(async () => {
            const tx = await db.transaction();
            try {
                const [hdr] = await db.query(
                    `INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                     VALUES (gen_random_uuid(), :userId, '2026-10-04', 'cleared', 'expense', NOW(), NOW())
                     RETURNING id;`,
                    { replacements: { userId: userA }, transaction: tx }
                );
                const txId = hdr[0].id;

                // Inserting line with USD currency pointing to DOP account
                await db.query(
                    `INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                     VALUES (gen_random_uuid(), :txId, :accId, 10000, 'USD', NOW(), NOW());`,
                    { replacements: { txId, accId: accountDopA.id }, transaction: tx }
                );

                await tx.commit();
            } catch (err) {
                await tx.rollback().catch(() => {});
                throw err;
            }
        }, /Transaction line currency \(USD\) must match account currency \(DOP\)/i);
    });

    it('8. SQL DIRECTO RECHAZADO: constraint trigger diferido rechaza multicurrency a nivel COMMIT', async () => {
        await assert.rejects(async () => {
            const tx = await db.transaction();
            try {
                const [hdr] = await db.query(
                    `INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                     VALUES (gen_random_uuid(), :userId, '2026-10-04', 'cleared', 'expense', NOW(), NOW())
                     RETURNING id;`,
                    { replacements: { userId: userA }, transaction: tx }
                );
                const txId = hdr[0].id;

                // Two lines without account_id, summing to scalar 0 but different currencies
                await db.query(
                    `INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                     VALUES (gen_random_uuid(), :txId, 10000, 'USD', NOW(), NOW()),
                            (gen_random_uuid(), :txId, -10000, 'DOP', NOW(), NOW());`,
                    { replacements: { txId }, transaction: tx }
                );

                await tx.commit();
            } catch (err) {
                await tx.rollback().catch(() => {});
                throw err;
            }
        }, /mixes multiple currencies/i);
    });

    it('9. Rechaza cuenta de otro usuario (tenant isolation)', async () => {
        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Cross-tenant account theft',
                lines: [
                    { accountId: accountDopA.id, amountMinor: '5000', currency: 'DOP' },
                    { accountId: accountDopB.id, amountMinor: '-5000', currency: 'DOP' }
                ]
            }
        };
        const res = createMockRes();

        await createTransaction(req, res);
        assert.equal(res.statusCode, 403);
        assert.match(res.body.error, /Acceso denegado/i);
    });

    it('10. Rollback completo: fallo atómico no deja cabecera ni altera balances', async () => {
        const initialBalance = (await Account.findByPk(accountDopA.id)).currentBalanceMinor;

        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Intentional unbalanced crash',
                lines: [
                    { accountId: accountDopA.id, amountMinor: '5000', currency: 'DOP' },
                    { accountId: accountDopA.id, amountMinor: '-4000', currency: 'DOP' }
                ]
            }
        };
        const res = createMockRes();

        await createTransaction(req, res);
        assert.equal(res.statusCode, 400);

        const postBalance = (await Account.findByPk(accountDopA.id)).currentBalanceMinor;
        assert.equal(initialBalance.toString(), postBalance.toString());
    });

    it('11. Cantidades BIGINT: maneja montos superiores a 2^53 - 1 centavos con exactitud', async () => {
        const bigAmountMinor = '9007199254740993'; // MAX_SAFE_INTEGER + 2
        const targetDopA2 = await Account.create({
            userId: userA,
            name: 'A DOP Big Vault',
            type: 'checking',
            currency: 'DOP',
            openingBalanceMinor: 0n,
            currentBalanceMinor: 0n
        });

        const req = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'BIGINT exact transfer',
                type: 'transfer',
                lines: [
                    { accountId: targetDopA2.id, amountMinor: bigAmountMinor, currency: 'DOP' },
                    { accountId: accountDopA.id, amountMinor: `-${bigAmountMinor}`, currency: 'DOP' }
                ]
            }
        };
        const res = createMockRes();

        await createTransaction(req, res);
        assert.ok(res.statusCode === 200 || res.statusCode === 201);

        const vaultAcc = await Account.findByPk(targetDopA2.id);
        assert.equal(vaultAcc.currentBalanceMinor.toString(), bigAmountMinor);
    });

    it('12. Rechaza montos con importe cero o formato inválido', async () => {
        const reqZero = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Zero amount line',
                lines: [
                    { accountId: accountDopA.id, amountMinor: '0', currency: 'DOP' },
                    { accountId: accountDopA.id, amountMinor: '0', currency: 'DOP' }
                ]
            }
        };
        const resZero = createMockRes();
        await createTransaction(reqZero, resZero);
        assert.equal(resZero.statusCode, 400);
        assert.match(resZero.body.error, /no puede ser cero/i);

        const reqInvalid = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'NaN amount line',
                lines: [
                    { accountId: accountDopA.id, amount: 'abc', currency: 'DOP' },
                    { accountId: accountDopA.id, amount: '-abc', currency: 'DOP' }
                ]
            }
        };
        const resInvalid = createMockRes();
        await createTransaction(reqInvalid, resInvalid);
        assert.equal(resInvalid.statusCode, 400);
    });

    it('13. Rechaza desbordamiento numérico superior al límite BIGINT de PostgreSQL', async () => {
        const overflowStr = '99999999999999999999999999999999';
        const reqOverflow = {
            user: { username: userA, role: 'user' },
            body: {
                date: '2026-10-04',
                memo: 'Overflow amount',
                lines: [
                    { accountId: accountDopA.id, amountMinor: overflowStr, currency: 'DOP' },
                    { accountId: accountDopA.id, amountMinor: `-${overflowStr}`, currency: 'DOP' }
                ]
            }
        };
        const resOverflow = createMockRes();
        await createTransaction(reqOverflow, resOverflow);
        assert.equal(resOverflow.statusCode, 400);
        assert.match(resOverflow.body.error, /desbordamiento/i);
    });

    after(async () => {
        try {
            await db.close();
        } catch (_) {}
    });
});
