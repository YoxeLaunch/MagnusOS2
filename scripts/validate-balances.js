#!/usr/bin/env node
/**
 * Magnus-OS2 Balance Validation Script
 * Validates that all account balances are correct after migration
 * 
 * Usage:
 *   node scripts/validate-balances.js
 */

import { Sequelize } from 'sequelize';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/magnus';

console.log('🔍 Magnus-OS2 Balance Validation');
console.log('================================');

const main = async () => {
    const sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        dialectModule: pg,
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL');

        // 1. Check that all transactions balance (sum of lines = 0)
        console.log('\n📊 Checking transaction balance integrity...');

        const [unbalanced] = await sequelize.query(`
            SELECT 
                lt.id,
                lt.date,
                lt.payee_name,
                SUM(tl.amount_minor) as net_balance
            FROM ledger_transactions lt
            JOIN transaction_lines tl ON tl.transaction_id = lt.id
            GROUP BY lt.id, lt.date, lt.payee_name
            HAVING SUM(tl.amount_minor) != 0
            LIMIT 10
        `);

        if (unbalanced.length === 0) {
            console.log('   ✅ All transactions are balanced (sum = 0)');
        } else {
            console.log(`   ⚠️ Found ${unbalanced.length} unbalanced transactions:`);
            unbalanced.forEach(tx => {
                console.log(`      - ${tx.date} | ${tx.payee_name} | Net: ${tx.net_balance / 100}`);
            });
        }

        // 2. Check account balances match transaction sums
        console.log('\n📊 Checking account balances vs transaction sums...');

        const [mismatches] = await sequelize.query(`
            WITH calculated AS (
                SELECT 
                    account_id,
                    SUM(amount_minor) as calculated_balance
                FROM transaction_lines
                GROUP BY account_id
            )
            SELECT 
                a.id,
                a.name,
                a.user_id,
                a.current_balance_minor as stored_balance,
                COALESCE(c.calculated_balance, 0) as calculated_balance,
                a.current_balance_minor - COALESCE(c.calculated_balance, 0) as difference
            FROM accounts a
            LEFT JOIN calculated c ON c.account_id = a.id
            WHERE a.current_balance_minor != COALESCE(c.calculated_balance, 0) + a.opening_balance_minor
        `);

        if (mismatches.length === 0) {
            console.log('   ✅ All account balances are correct');
        } else {
            console.log(`   ⚠️ Found ${mismatches.length} accounts with balance mismatch:`);
            mismatches.forEach(acc => {
                console.log(`      - ${acc.name} (${acc.user_id})`);
                console.log(`        Stored: ${acc.stored_balance / 100}, Calculated: ${acc.calculated_balance / 100}, Diff: ${acc.difference / 100}`);
            });
        }

        // 3. Summary statistics
        console.log('\n📊 Summary Statistics...');

        const [stats] = await sequelize.query(`
            SELECT 
                (SELECT COUNT(*) FROM accounts) as accounts,
                (SELECT COUNT(*) FROM ledger_transactions) as transactions,
                (SELECT COUNT(*) FROM transaction_lines) as transaction_lines,
                (SELECT COUNT(DISTINCT user_id) FROM ledger_transactions) as users,
                (SELECT SUM(current_balance_minor) FROM accounts WHERE type NOT IN ('credit_card', 'loan')) as total_assets,
                (SELECT SUM(current_balance_minor) FROM accounts WHERE type IN ('credit_card', 'loan')) as total_liabilities
        `);

        const s = stats[0];
        console.log(`   Accounts: ${s.accounts}`);
        console.log(`   Transactions: ${s.transactions}`);
        console.log(`   Transaction Lines: ${s.transaction_lines}`);
        console.log(`   Users: ${s.users}`);
        console.log(`   Total Assets: ${(s.total_assets || 0) / 100}`);
        console.log(`   Total Liabilities: ${(s.total_liabilities || 0) / 100}`);
        console.log(`   Net Worth: ${((s.total_assets || 0) - Math.abs(s.total_liabilities || 0)) / 100}`);

        // 4. Check for orphaned records
        console.log('\n📊 Checking for orphaned records...');

        const [orphanedLines] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM transaction_lines tl
            LEFT JOIN ledger_transactions lt ON lt.id = tl.transaction_id
            WHERE lt.id IS NULL
        `);

        const [orphanedByAccount] = await sequelize.query(`
            SELECT COUNT(*) as count
            FROM transaction_lines tl
            LEFT JOIN accounts a ON a.id = tl.account_id
            WHERE a.id IS NULL
        `);

        if (orphanedLines[0].count === '0' && orphanedByAccount[0].count === '0') {
            console.log('   ✅ No orphaned records found');
        } else {
            console.log(`   ⚠️ Orphaned lines (no transaction): ${orphanedLines[0].count}`);
            console.log(`   ⚠️ Orphaned lines (no account): ${orphanedByAccount[0].count}`);
        }

        console.log('\n================================');
        console.log('🎉 Validation complete!');

        await sequelize.close();

    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    }
};

main();
