#!/usr/bin/env node
/**
 * Magnus-OS2 Data Migration Script
 * Migrates data from SQLite (legacy) to PostgreSQL (new schema)
 * 
 * Usage:
 *   node scripts/migrate-data.js --source=./server/data/finanza.db --dry-run
 *   node scripts/migrate-data.js --source=./server/data/finanza.db --execute
 */

import { Sequelize, DataTypes } from 'sequelize';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ========================================
// Configuration
// ========================================
const args = process.argv.slice(2);
const config = {
    source: args.find(a => a.startsWith('--source='))?.split('=')[1] || './server/data/finanza.db',
    dryRun: !args.includes('--execute'),
    verbose: args.includes('--verbose'),
    targetUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/magnus'
};

console.log('🚀 Magnus-OS2 Data Migration');
console.log('============================');
console.log(`Source: ${config.source}`);
console.log(`Target: ${config.targetUrl.replace(/:[^:@]+@/, ':****@')}`);
console.log(`Mode: ${config.dryRun ? 'DRY RUN (no changes)' : '⚠️ EXECUTE MODE'}`);
console.log('');

// ========================================
// Connect to databases
// ========================================
const connectDatabases = async () => {
    // SQLite source
    if (!fs.existsSync(config.source)) {
        throw new Error(`Source database not found: ${config.source}`);
    }

    const sourceDb = new Sequelize({
        dialect: 'sqlite',
        storage: config.source,
        logging: config.verbose ? console.log : false
    });

    // PostgreSQL target
    const targetDb = new Sequelize(config.targetUrl, {
        dialect: 'postgres',
        dialectModule: pg,
        logging: config.verbose ? console.log : false
    });

    await sourceDb.authenticate();
    console.log('✅ Connected to SQLite source');

    await targetDb.authenticate();
    console.log('✅ Connected to PostgreSQL target');

    return { sourceDb, targetDb };
};

// ========================================
// Define legacy models
// ========================================
const defineLegacyModels = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: { type: DataTypes.STRING, primaryKey: true },
        name: DataTypes.STRING,
        amount: DataTypes.FLOAT,
        frequency: DataTypes.STRING,
        category: DataTypes.STRING,
        currency: DataTypes.STRING,
        type: DataTypes.STRING,
        deductions: DataTypes.JSON
    }, { tableName: 'Transactions', timestamps: true });

    const DailyTransaction = sequelize.define('DailyTransaction', {
        id: { type: DataTypes.STRING, primaryKey: true },
        date: DataTypes.STRING,
        concept: DataTypes.STRING,
        amount: DataTypes.FLOAT,
        type: DataTypes.STRING,
        category: DataTypes.STRING,
        currency: DataTypes.STRING,
        paymentMethod: DataTypes.STRING,
        notes: DataTypes.STRING,
        userId: DataTypes.STRING
    }, { tableName: 'DailyTransactions', timestamps: true });

    return { Transaction, DailyTransaction };
};

// ========================================
// Migration functions
// ========================================

const generateHash = (date, amount, description) => {
    const raw = `${date}|${amount}|${(description || '').toLowerCase().trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
};

const toMinorUnits = (amount) => Math.round((amount || 0) * 100);

const migrateUsers = async (sourceDb, targetDb, dryRun) => {
    console.log('\n📦 Migrating Users...');

    // Get unique userIds from DailyTransactions
    const [results] = await sourceDb.query('SELECT DISTINCT userId FROM DailyTransactions WHERE userId IS NOT NULL');
    const userIds = results.map(r => r.userId).filter(Boolean);

    console.log(`   Found ${userIds.length} unique users`);

    if (!dryRun) {
        for (const userId of userIds) {
            await targetDb.query(`
                INSERT INTO "Users" (username, password, role, "createdAt", "updatedAt")
                VALUES (:username, '$2b$10$Elr4/PyGrHAXY4XyNZXgJu9v9HK6zTKxkBYpXEMGPKOGp7kh6qACK', 'user', NOW(), NOW())
                ON CONFLICT (username) DO NOTHING
            `, { replacements: { username: userId } });
        }
    }

    return userIds;
};

const migrateAccounts = async (targetDb, userIds, dryRun) => {
    console.log('\n📦 Creating default Accounts...');

    const accountMap = {};

    for (const userId of userIds) {
        if (!dryRun) {
            // Create a default "Efectivo" account for each user
            const [accounts] = await targetDb.query(`
                INSERT INTO "accounts" (id, "user_id", name, type, currency, "current_balance_minor", "opening_balance_minor", "sort_order", "created_at", "updated_at")
                VALUES (gen_random_uuid(), :userId, 'Efectivo', 'cash', 'DOP', 0, 0, 0, NOW(), NOW())
                ON CONFLICT DO NOTHING
                RETURNING id
            `, { replacements: { userId } });

            if (accounts.length > 0) {
                accountMap[userId] = accounts[0].id;
            } else {
                const [existing] = await targetDb.query(
                    `SELECT id FROM "accounts" WHERE "user_id" = :userId LIMIT 1`,
                    { replacements: { userId } }
                );
                if (existing.length > 0) {
                    accountMap[userId] = existing[0].id;
                }
            }
        } else {
            accountMap[userId] = 'dry-run-account-id';
        }
    }

    console.log(`   Created ${Object.keys(accountMap).length} default accounts`);
    return accountMap;
};

const migrateCategories = async (sourceDb, targetDb, userIds, dryRun) => {
    console.log('\n📦 Migrating Categories...');

    // Get unique categories from DailyTransactions
    const [results] = await sourceDb.query('SELECT DISTINCT userId, category, type FROM DailyTransactions WHERE category IS NOT NULL');
    console.log(`   Found ${results.length} unique categories`);

    const categoryMap = {}; // Key: userId:categoryName -> Value: categoryId

    if (!dryRun) {
        for (const row of results) {
            if (!userIds.includes(row.userId)) continue;

            const categoryType = row.type === 'income' ? 'income' : 'expense';

            // Create category
            const [categories] = await targetDb.query(`
                INSERT INTO "categories" (id, "user_id", name, type, "created_at", "updated_at")
                VALUES (gen_random_uuid(), :userId, :name, :type, NOW(), NOW())
                ON CONFLICT DO NOTHING
                RETURNING id
            `, {
                replacements: {
                    userId: row.userId,
                    name: row.category,
                    type: categoryType
                }
            });

            let categoryId;
            if (categories.length > 0) {
                categoryId = categories[0].id;
            } else {
                // Find existing if conflict
                const [existing] = await targetDb.query(`
                    SELECT id FROM "categories" 
                    WHERE "user_id" = :userId AND name = :name AND type = :type 
                    LIMIT 1
                `, {
                    replacements: {
                        userId: row.userId,
                        name: row.category,
                        type: categoryType
                    }
                });
                if (existing.length > 0) categoryId = existing[0].id;
            }

            if (categoryId) {
                categoryMap[`${row.userId}:${row.category}`] = categoryId;
            }
        }
    }

    console.log(`   Mapped ${Object.keys(categoryMap).length} categories`);
    return categoryMap;
};

const migrateDailyTransactions = async (sourceDb, targetDb, accountMap, categoryMap, dryRun) => {
    console.log('\n📦 Migrating DailyTransactions to Ledger...');

    const [transactions] = await sourceDb.query('SELECT * FROM DailyTransactions ORDER BY date');
    console.log(`   Found ${transactions.length} daily transactions`);

    let migrated = 0;
    let skipped = 0;

    for (const tx of transactions) {
        const accountId = accountMap[tx.userId];
        if (!accountId) {
            skipped++;
            continue;
        }

        const categoryKey = `${tx.userId}:${tx.category}`;
        const categoryId = categoryMap[categoryKey];

        const hash = generateHash(tx.date, tx.amount, tx.concept);
        const amount = tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount);

        if (!dryRun) {
            try {
                // Create LedgerTransaction
                const [ledgerTx] = await targetDb.query(`
                    INSERT INTO "ledger_transactions" (id, "user_id", date, "payee_name", memo, status, type, reference, "created_at", "updated_at")
                    VALUES (gen_random_uuid(), :userId, :date, :payeeName, :memo, 'cleared', :type, :reference, NOW(), NOW())
                    RETURNING id
                `, {
                    replacements: {
                        userId: tx.userId,
                        date: tx.date,
                        payeeName: tx.concept || null,
                        memo: tx.notes || null,
                        type: tx.type || 'expense',
                        reference: `migrated:${hash}`
                    }
                });

                if (ledgerTx.length > 0) {
                    const txId = ledgerTx[0].id;

                    // Create TransactionLine (Asset/Liability side)
                    await targetDb.query(`
                        INSERT INTO "transaction_lines" (id, "transaction_id", "account_id", "amount_minor", currency, "created_at", "updated_at")
                        VALUES (gen_random_uuid(), :txId, :accountId, :amount, :currency, NOW(), NOW())
                    `, {
                        replacements: {
                            txId,
                            accountId,
                            amount: toMinorUnits(amount),
                            currency: tx.currency || 'DOP'
                        }
                    });

                    // Create balancing line (Income/Expense Category side)
                    // Note: Balancing amount is opposite (-amount)
                    await targetDb.query(`
                        INSERT INTO "transaction_lines" (id, "transaction_id", "category_id", "amount_minor", currency, memo, "created_at", "updated_at")
                        VALUES (gen_random_uuid(), :txId, :categoryId, :amount, :currency, 'Balance entry', NOW(), NOW())
                    `, {
                        replacements: {
                            txId,
                            categoryId: categoryId || null, // Can be null if not found, but ideally shouldn't be
                            amount: toMinorUnits(-amount),
                            currency: tx.currency || 'DOP'
                        }
                    });

                    migrated++;
                }
            } catch (err) {
                console.error(`   ❌ Error migrating tx ${tx.id}: ${err.message}`);
                skipped++;
            }
        } else {
            migrated++;
        }
    }

    console.log(`   ✅ Migrated: ${migrated}, Skipped: ${skipped}`);
    return { migrated, skipped };
};

const updateAccountBalances = async (targetDb, accountMap, dryRun) => {
    console.log('\n📦 Recalculating account balances...');

    if (dryRun) {
        console.log('   (skipped in dry-run mode)');
        return;
    }

    for (const [userId, accountId] of Object.entries(accountMap)) {
        const [result] = await targetDb.query(`
            UPDATE "accounts"
            SET "current_balance_minor" = COALESCE((
                SELECT SUM("amount_minor")
                FROM "transaction_lines"
                WHERE "account_id" = :accountId
            ), 0)
            WHERE id = :accountId
            RETURNING "current_balance_minor"
        `, { replacements: { accountId } });

        if (result.length > 0) {
            console.log(`   Account ${accountId}: balance = ${result[0].currentBalanceMinor / 100}`);
        }
    }
};

// ========================================
// Main execution
// ========================================
const main = async () => {
    try {
        const { sourceDb, targetDb } = await connectDatabases();

        // Define legacy models
        const legacyModels = defineLegacyModels(sourceDb);

        // Run migrations
        const userIds = await migrateUsers(sourceDb, targetDb, config.dryRun);
        const accountMap = await migrateAccounts(targetDb, userIds, config.dryRun);
        const categoryMap = await migrateCategories(sourceDb, targetDb, userIds, config.dryRun);
        const txResult = await migrateDailyTransactions(sourceDb, targetDb, accountMap, categoryMap, config.dryRun);
        await updateAccountBalances(targetDb, accountMap, config.dryRun);

        console.log('\n============================');
        console.log('🎉 Migration Summary');
        console.log('============================');
        console.log(`Users: ${userIds.length}`);
        console.log(`Accounts: ${Object.keys(accountMap).length}`);
        console.log(`Transactions: ${txResult.migrated} migrated, ${txResult.skipped} skipped`);

        if (config.dryRun) {
            console.log('\n⚠️ This was a DRY RUN. No data was actually modified.');
            console.log('   Run with --execute to apply changes.');
        } else {
            console.log('\n✅ Migration completed successfully!');
        }

        await sourceDb.close();
        await targetDb.close();

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        if (config.verbose) console.error(error);
        process.exit(1);
    }
};

main();
