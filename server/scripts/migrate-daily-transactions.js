// Migration script: SQLite (finanza.db) -> PostgreSQL (DailyTransactions)
import sqlite3 from 'sqlite3';
import pg from 'pg';
const { Client } = pg;

const SQLITE_PATH = '/app/server/data/finanza.db';
const PG_URL = 'postgresql://magnus:magnus@postgres:5432/magnus';

async function migrate() {
    console.log('🔄 Starting migration: SQLite -> PostgreSQL');

    // 1. Read from SQLite
    const sqliteDb = new sqlite3.Database(SQLITE_PATH, sqlite3.OPEN_READONLY);

    const getDailyTransactions = () => new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM DailyTransactions ORDER BY id', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    let transactions;
    try {
        transactions = await getDailyTransactions();
        console.log(`📊 Found ${transactions.length} daily transactions in SQLite`);
    } catch (error) {
        console.error('❌ Error reading from SQLite:', error.message);
        sqliteDb.close();
        process.exit(1);
    }

    sqliteDb.close();

    if (transactions.length === 0) {
        console.log('ℹ️  No transactions to migrate. Exiting.');
        process.exit(0);
    }

    // 2. Write to PostgreSQL
    const pgClient = new Client({ connectionString: PG_URL });

    try {
        await pgClient.connect();
        console.log('✅ Connected to PostgreSQL');

        let inserted = 0;
        let skipped = 0;

        for (const tx of transactions) {
            try {
                // Check if already exists (avoid duplicates)
                const existing = await pgClient.query(
                    'SELECT id FROM "DailyTransactions" WHERE id = $1',
                    [tx.id]
                );

                if (existing.rows.length > 0) {
                    skipped++;
                    continue;
                }

                // Insert transaction
                await pgClient.query(
                    `INSERT INTO "DailyTransactions" 
                    (id, "userId", date, amount, description, type, category, "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        tx.id,
                        tx.userId,
                        tx.date,
                        tx.amount,
                        tx.description,
                        tx.type,
                        tx.category,
                        tx.createdAt || new Date().toISOString(),
                        tx.updatedAt || new Date().toISOString()
                    ]
                );

                inserted++;
            } catch (error) {
                console.error(`⚠️  Error inserting transaction ID ${tx.id}:`, error.message);
            }
        }

        console.log(`\n✨ Migration completed!`);
        console.log(`   📥 Inserted: ${inserted}`);
        console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
        console.log(`   📊 Total processed: ${transactions.length}`);

        // Fix: Reset autoincrement sequence to max ID
        console.log(`\n🔧 Resetting autoincrement sequence...`);
        const maxIdResult = await pgClient.query('SELECT MAX(id) FROM "DailyTransactions"');
        const maxId = maxIdResult.rows[0].max || 0;

        if (maxId > 0) {
            await pgClient.query('SELECT setval(\'"DailyTransactions_id_seq"\', $1)', [maxId]);
            console.log(`✅ Sequence reset to ${maxId}`);
        }

        await pgClient.end();
    } catch (error) {
        console.error('❌ PostgreSQL error:', error.message);
        await pgClient.end();
        process.exit(1);
    }
}

migrate().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});
