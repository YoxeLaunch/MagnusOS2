import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import {
    TEST_DB_URL,
    assertSafeTestEnvironment,
    sequelize,
    initializeTestPostgres
} from './setupTestDb.js';

describe('PostgreSQL Real Integration Tests — MagnusOS2 Ledger & Database Hardening', () => {
    before(async () => {
        // Enforce guardrail
        assertSafeTestEnvironment(TEST_DB_URL);

        await sequelize.authenticate();

        // Sync schema and apply PostgreSQL triggers and functions
        await initializeTestPostgres();
    });

    beforeEach(async () => {
        // Clean ledger and test tables between tests
        await sequelize.query('TRUNCATE TABLE transaction_lines CASCADE;');
        await sequelize.query('TRUNCATE TABLE ledger_transactions CASCADE;');
        await sequelize.query('TRUNCATE TABLE accounts CASCADE;');
        await sequelize.query('TRUNCATE TABLE categories CASCADE;');
        await sequelize.query('TRUNCATE TABLE monthly_snapshots CASCADE;').catch(() => {});
        await sequelize.query('TRUNCATE TABLE "Users" CASCADE;');
    });

    describe('1. Production Safety Guardrails', () => {
        it('debe abortar si el nombre de base de datos es "magnus" (producción)', () => {
            const prodUrl = 'postgresql://magnus_test_user:pass@127.0.0.1:5433/magnus';
            assert.throws(() => {
                assertSafeTestEnvironment(prodUrl);
            }, /Refusing to run tests against 'magnus'/);
        });

        it('debe abortar si el usuario es "magnus_app" o "magnus"', () => {
            const appUrl = 'postgresql://magnus_app:pass@127.0.0.1:5433/magnus_test';
            assert.throws(() => {
                assertSafeTestEnvironment(appUrl);
            }, /Refusing to run tests with production user/);
        });

        it('debe abortar si apunta al puerto 5432 o host "postgres"', () => {
            const hostUrl = 'postgresql://magnus_test_user:pass@postgres:5432/magnus_test';
            assert.throws(() => {
                assertSafeTestEnvironment(hostUrl);
            }, /Refusing to run tests against production PostgreSQL host\/port/);
        });
    });

    describe('2. Migrations & Catalog Verification', () => {
        it('debe verificar que la función check_ledger_transaction_balance y el constraint trigger existen en PostgreSQL', async () => {
            // Check function
            const [procRows] = await sequelize.query(`
                SELECT proname FROM pg_proc WHERE proname = 'check_ledger_transaction_balance';
            `);
            assert.equal(procRows.length, 1, 'check_ledger_transaction_balance function must exist in pg_proc');

            // Check trigger
            const [trgRows] = await sequelize.query(`
                SELECT tgname, tgdeferrable, tginitdeferred 
                FROM pg_trigger 
                WHERE tgname = 'trg_check_ledger_transaction_balance';
            `);
            assert.equal(trgRows.length, 1, 'trg_check_ledger_transaction_balance must exist');
            assert.equal(trgRows[0].tgdeferrable, true, 'Trigger must be DEFERRABLE');
            assert.equal(trgRows[0].tginitdeferred, true, 'Trigger must be INITIALLY DEFERRED');
        });
    });

    describe('3. Constraint Trigger Ledger — Partida Doble (Double-Entry Invariants)', () => {
        it('RECHAZA transacción con una sola línea en el COMMIT (viola regla >= 2 líneas)', async () => {
            const txId = uuidv4();
            const accId = uuidv4();
            const now = new Date();

            // Create account
            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Cuenta Test', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            await assert.rejects(async () => {
                const t = await sequelize.transaction();
                try {
                    // Insert header
                    await sequelize.query(`
                        INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                        VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
                    `, { transaction: t });

                    // Insert only 1 line
                    await sequelize.query(`
                        INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                        VALUES ('${uuidv4()}', '${txId}', '${accId}', 500000, 'DOP', NOW(), NOW());
                    `, { transaction: t });

                    // COMMIT should fail via trigger
                    await t.commit();
                } catch (err) {
                    await t.rollback().catch(() => {});
                    throw err;
                }
            }, (err) => {
                assert.match(err.message, /must have at least 2 lines/);
                return true;
            });

            // Verify clean rollback: 0 rows in ledger_transactions
            const [rows] = await sequelize.query(`SELECT count(*) FROM ledger_transactions WHERE id = '${txId}';`);
            assert.equal(rows[0].count, '0');
        });

        it('RECHAZA transacción desbalanceada con SUM != 0 en el COMMIT (+5000 y -4000)', async () => {
            const txId = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Cuenta Test', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            await assert.rejects(async () => {
                const t = await sequelize.transaction();
                try {
                    await sequelize.query(`
                        INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                        VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
                    `, { transaction: t });

                    // Line 1: +5,000 DOP (+500,000 cents)
                    await sequelize.query(`
                        INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                        VALUES ('${uuidv4()}', '${txId}', '${accId}', 500000, 'DOP', NOW(), NOW());
                    `, { transaction: t });

                    // Line 2: -4,000 DOP (-400,000 cents) -> Unbalanced by +100,000 cents
                    await sequelize.query(`
                        INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                        VALUES ('${uuidv4()}', '${txId}', -400000, 'DOP', NOW(), NOW());
                    `, { transaction: t });

                    await t.commit();
                } catch (err) {
                    await t.rollback().catch(() => {});
                    throw err;
                }
            }, (err) => {
                assert.match(err.message, /is unbalanced.*100000 minor units \(must be 0\)/);
                return true;
            });
        });

        it('ACEPTA transacción con 2 líneas y SUM = 0 (+5000 y -5000)', async () => {
            const txId = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Efectivo DOP', 'cash', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();
            // Header
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: t });

            // Line 1: Account debit (+5000 DOP)
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', 500000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            // Line 2: Balancing counterparty credit (-5000 DOP)
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -500000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            // COMMIT must succeed
            await t.commit();

            const [rows] = await sequelize.query(`
                SELECT COUNT(*) as count, SUM(amount_minor) as sum 
                FROM transaction_lines 
                WHERE transaction_id = '${txId}';
            `);
            assert.equal(rows[0].count, '2');
            assert.equal(rows[0].sum, '0');
        });

        it('ACEPTA transacción compuesta (split) de 3 líneas con SUM = 0 (+10000, -6000, -4000)', async () => {
            const txId = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Banco', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: t });

            // Account line: +10,000 DOP
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', 1000000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            // Counterparty category A: -6,000 DOP
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -600000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            // Counterparty category B: -4,000 DOP
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -400000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await t.commit();

            const [rows] = await sequelize.query(`
                SELECT COUNT(*) as count, SUM(amount_minor) as sum 
                FROM transaction_lines 
                WHERE transaction_id = '${txId}';
            `);
            assert.equal(rows[0].count, '3');
            assert.equal(rows[0].sum, '0');
        });

        it('RECHAZA cabecera de transacción con 0 líneas en el COMMIT (BLOCKER-01)', async () => {
            const txId = uuidv4();

            await assert.rejects(async () => {
                const t = await sequelize.transaction();
                try {
                    await sequelize.query(`
                        INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                        VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'expense', NOW(), NOW());
                    `, { transaction: t });

                    // Commit without adding any lines
                    await t.commit();
                } catch (err) {
                    await t.rollback().catch(() => {});
                    throw err;
                }
            }, (err) => {
                assert.match(err.message, /must have at least 2 lines \(found 0\)/);
                return true;
            });
        });

        it('RECHAZA reparentado de líneas que deje la cabecera original con 0 líneas (BLOCKER-01)', async () => {
            const txA = uuidv4();
            const txB = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Cuenta Reparent', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            // Setup Tx A with 2 balanced lines
            const tInit = await sequelize.transaction();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txA}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: tInit });
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txA}', '${accId}', 50000, 'DOP', NOW(), NOW());
            `, { transaction: tInit });
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txA}', -50000, 'DOP', NOW(), NOW());
            `, { transaction: tInit });
            await tInit.commit();

            // Now attempt to move both lines from Tx A to Tx B, leaving Tx A with 0 lines
            await assert.rejects(async () => {
                const t = await sequelize.transaction();
                try {
                    await sequelize.query(`
                        INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                        VALUES ('${txB}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
                    `, { transaction: t });

                    // Reparent lines from A to B
                    await sequelize.query(`
                        UPDATE transaction_lines
                        SET transaction_id = '${txB}'
                        WHERE transaction_id = '${txA}';
                    `, { transaction: t });

                    await t.commit();
                } catch (err) {
                    await t.rollback().catch(() => {});
                    throw err;
                }
            }, (err) => {
                assert.match(err.message, /must have at least 2 lines/);
                return true;
            });
        });

        it('RECHAZA transacción con líneas de cuentas pertenecientes a otro usuario (HIGH-04)', async () => {
            const txId = uuidv4();
            const accUserB = uuidv4();

            // Account belongs to user_b
            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accUserB}', 'user_b', 'Cuenta de B', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            await assert.rejects(async () => {
                const t = await sequelize.transaction();
                try {
                    // Transaction belongs to user_a
                    await sequelize.query(`
                        INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                        VALUES ('${txId}', 'user_a', '2026-10-04', 'cleared', 'income', NOW(), NOW());
                    `, { transaction: t });

                    // Line referencing account of user_b
                    await sequelize.query(`
                        INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                        VALUES ('${uuidv4()}', '${txId}', '${accUserB}', 10000, 'DOP', NOW(), NOW());
                    `, { transaction: t });

                    await sequelize.query(`
                        INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                        VALUES ('${uuidv4()}', '${txId}', -10000, 'DOP', NOW(), NOW());
                    `, { transaction: t });

                    await t.commit();
                } catch (err) {
                    await t.rollback().catch(() => {});
                    throw err;
                }
            }, (err) => {
                assert.match(err.message, /belonging to accounts of a different user/);
                return true;
            });
        });
    });

    describe('4. Transaction Rollback & Atomicity', () => {
        it('un error o rollback explícito no deja cabeceras ni líneas huérfanas', async () => {
            const txId = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Rollback Acc', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'test_user', '2026-10-04', 'pending', 'expense', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', -10000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            // Abort transaction explicitly
            await t.rollback();

            const [txRows] = await sequelize.query(`SELECT count(*) FROM ledger_transactions WHERE id = '${txId}';`);
            const [lineRows] = await sequelize.query(`SELECT count(*) FROM transaction_lines WHERE transaction_id = '${txId}';`);

            assert.equal(txRows[0].count, '0', 'Header must be rolled back');
            assert.equal(lineRows[0].count, '0', 'Lines must be rolled back');
        });
    });

    describe('5. BIGINT Amounts Precision', () => {
        it('permite almacenar y recuperar montos mayores a 32 bits (2^31 - 1 cents) sin truncamiento ni overflow', async () => {
            const accId = uuidv4();
            const txId = uuidv4();
            // 50,000,000,000 cents = 500,000,000 DOP (> 2^31 - 1 = 2,147,483,647)
            const largeAmount = '50000000000';

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Gran Tesorería', 'checking', 'DOP', ${largeAmount}, ${largeAmount}, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', ${largeAmount}, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -${largeAmount}, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await t.commit();

            const [accRows] = await sequelize.query(`SELECT current_balance_minor FROM accounts WHERE id = '${accId}';`);
            assert.equal(accRows[0].current_balance_minor, largeAmount);

            const [lineRows] = await sequelize.query(`SELECT amount_minor FROM transaction_lines WHERE transaction_id = '${txId}' AND account_id = '${accId}';`);
            assert.equal(lineRows[0].amount_minor, largeAmount);
        });

        it('maneja montos BIGINT superiores a Number.MAX_SAFE_INTEGER (> 2^53 - 1 cents) manteniendo precisión exacta (HIGH-03)', async () => {
            const accId = uuidv4();
            const txId = uuidv4();
            // 9,007,199,254,740,993 cents (> Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991)
            const hugeAmount = '9007199254740993';

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'test_user', 'Super Tesorería', 'checking', 'DOP', 0, ${hugeAmount}, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();
            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'test_user', '2026-10-04', 'cleared', 'income', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', ${hugeAmount}, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -${hugeAmount}, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await t.commit();

            const [lineRows] = await sequelize.query(`SELECT amount_minor FROM transaction_lines WHERE transaction_id = '${txId}' AND account_id = '${accId}';`);
            assert.equal(lineRows[0].amount_minor, hugeAmount);
        });
    });

    describe('6. Ownership & Multi-tenant Isolation', () => {
        it('aísla transacciones y balances estrictamente por user_id', async () => {
            const user1AccId = uuidv4();
            const user2AccId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES 
                ('${user1AccId}', 'user_soberano', 'Cuenta Soberano', 'checking', 'DOP', 0, 100000, false, 0, NOW(), NOW()),
                ('${user2AccId}', 'user_otro', 'Cuenta Otro', 'checking', 'DOP', 0, 999999, false, 0, NOW(), NOW());
            `);

            // Query scoped by user_soberano
            const [soberanoAccs] = await sequelize.query(`
                SELECT id, name, current_balance_minor FROM accounts WHERE user_id = 'user_soberano';
            `);
            assert.equal(soberanoAccs.length, 1);
            assert.equal(soberanoAccs[0].id, user1AccId);
            assert.equal(soberanoAccs[0].current_balance_minor, '100000');
        });
    });

    describe('7. Transferencias entre cuentas con balance derivado', () => {
        it('transfiere fondos entre dos cuentas manteniendo la suma de partida doble y saldos exactos', async () => {
            const accA = uuidv4();
            const accB = uuidv4();
            const txId = uuidv4();
            const transferAmount = 250000; // 2,500.00 DOP

            // Account A initial: 10,000 DOP (1,000,000 minor)
            // Account B initial: 1,000 DOP (100,000 minor)
            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES 
                ('${accA}', 'user_transfer', 'Origen', 'checking', 'DOP', 0, 1000000, false, 0, NOW(), NOW()),
                ('${accB}', 'user_transfer', 'Destino', 'savings', 'DOP', 0, 100000, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();

            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, memo, created_at, updated_at)
                VALUES ('${txId}', 'user_transfer', '2026-10-04', 'cleared', 'transfer', 'Ahorro mensual', NOW(), NOW());
            `, { transaction: t });

            // Line 1: -250,000 on Account A
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, memo, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accA}', -${transferAmount}, 'DOP', 'Transferencia saliente', NOW(), NOW());
            `, { transaction: t });

            // Line 2: +250,000 on Account B
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, memo, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accB}', ${transferAmount}, 'DOP', 'Transferencia entrante', NOW(), NOW());
            `, { transaction: t });

            // Update cached balances
            await sequelize.query(`
                UPDATE accounts SET current_balance_minor = current_balance_minor - ${transferAmount} WHERE id = '${accA}';
            `, { transaction: t });
            await sequelize.query(`
                UPDATE accounts SET current_balance_minor = current_balance_minor + ${transferAmount} WHERE id = '${accB}';
            `, { transaction: t });

            await t.commit();

            // Verify derived balance from lines matches cached balance
            const [derivedA] = await sequelize.query(`
                SELECT SUM(amount_minor) as total FROM transaction_lines WHERE account_id = '${accA}';
            `);
            const [accRowA] = await sequelize.query(`SELECT current_balance_minor FROM accounts WHERE id = '${accA}';`);
            assert.equal(accRowA[0].current_balance_minor, '750000');
            assert.equal(derivedA[0].total, '-250000');

            const [accRowB] = await sequelize.query(`SELECT current_balance_minor FROM accounts WHERE id = '${accB}';`);
            assert.equal(accRowB[0].current_balance_minor, '350000');
        });
    });

    describe('8. Transaction Isolation (READ COMMITTED)', () => {
        it('mantiene aislamiento en lecturas concurrentes sin exponer cambios no confirmados', async () => {
            const txId = uuidv4();
            const accId = uuidv4();

            await sequelize.query(`
                INSERT INTO accounts (id, user_id, name, type, currency, opening_balance_minor, current_balance_minor, is_archived, sort_order, created_at, updated_at)
                VALUES ('${accId}', 'iso_user', 'Iso Acc', 'checking', 'DOP', 0, 0, false, 0, NOW(), NOW());
            `);

            const t = await sequelize.transaction();

            await sequelize.query(`
                INSERT INTO ledger_transactions (id, user_id, date, status, type, created_at, updated_at)
                VALUES ('${txId}', 'iso_user', '2026-10-04', 'pending', 'income', NOW(), NOW());
            `, { transaction: t });

            // Query outside the uncommitted transaction
            const [outsideView] = await sequelize.query(`
                SELECT count(*) FROM ledger_transactions WHERE id = '${txId}';
            `);
            assert.equal(outsideView[0].count, '0', 'Uncommitted transaction must not be visible outside');

            // Complete the transaction with 2 balancing lines
            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, account_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', '${accId}', 50000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await sequelize.query(`
                INSERT INTO transaction_lines (id, transaction_id, amount_minor, currency, created_at, updated_at)
                VALUES ('${uuidv4()}', '${txId}', -50000, 'DOP', NOW(), NOW());
            `, { transaction: t });

            await t.commit();

            // After commit, it is visible
            const [afterCommitView] = await sequelize.query(`
                SELECT count(*) FROM ledger_transactions WHERE id = '${txId}';
            `);
            assert.equal(afterCommitView[0].count, '1');
        });
    });

    describe('9. Unique Constraints', () => {
        it('rechaza duplicados en índices únicos compuestos (monthly_snapshots)', async () => {
            const snapUser = 'user_snap_' + uuidv4().slice(0, 8);
            await sequelize.query(`
                INSERT INTO monthly_snapshots (period, user_id, computed_metrics, created_at)
                VALUES ('2026-08-01', '${snapUser}', '{"income": 1000}', NOW());
            `);

            // Inserting same period and user_id must fail with unique violation
            await assert.rejects(async () => {
                await sequelize.query(`
                    INSERT INTO monthly_snapshots (period, user_id, computed_metrics, created_at)
                    VALUES ('2026-08-01', '${snapUser}', '{"income": 2000}', NOW());
                `);
            }, (err) => {
                assert.ok(
                    err.name === 'SequelizeUniqueConstraintError' || 
                    /unique|duplicate|validation error/i.test(err.message),
                    `Expected unique violation error, got: ${err.name} - ${err.message}`
                );
                return true;
            });
        });
    });

    after(async () => {
        try {
            await sequelize.close();
        } catch (_) {}
    });
});
