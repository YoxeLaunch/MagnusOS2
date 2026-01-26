
import { Sequelize, DataTypes } from 'sequelize';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '../server/data/finanza.db');

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

console.log('🚀 Magnus-OS2 Missing Data Migration (Users & Budget)');
console.log('====================================================');
console.log(`Source: ${sourcePath}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : '⚠️ EXECUTE MODE'}`);

const connect = async () => {
    const source = new Sequelize({
        dialect: 'sqlite',
        storage: sourcePath,
        logging: false
    });

    const target = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/magnus', {
        dialect: 'postgres',
        dialectModule: pg,
        logging: false
    });

    await source.authenticate();
    await target.authenticate();
    return { source, target };
};

const migrate = async () => {
    const { source, target } = await connect();

    // 1. Missing Users (kiwssh)
    console.log('\n👤 Checking Users...');
    const [sourceUsers] = await source.query('SELECT * FROM Users');
    console.log(`   Found ${sourceUsers.length} users in source.`);

    if (!dryRun) {
        for (const u of sourceUsers) {
            // Check if exists
            const [exists] = await target.query(`SELECT 1 FROM "Users" WHERE username = :username`, {
                replacements: { username: u.username }
            });

            if (exists.length === 0) {
                console.log(`   + Creating missing user: ${u.username}`);
                await target.query(`
                    INSERT INTO "Users" (username, password, name, role, tags, preferences, "createdAt", "updatedAt")
                    VALUES (:username, :password, :name, :role, :tags, :preferences, :createdAt, :updatedAt)
                `, {
                    replacements: {
                        username: u.username,
                        password: u.password, // Already hashed or needs hash? Assuming source has hash.
                        name: u.name || u.username, // Fix null name
                        role: u.role || 'user',
                        tags: u.tags || '[]',
                        preferences: u.preferences || '{}',
                        createdAt: u.createdAt || new Date(),
                        updatedAt: u.updatedAt || new Date()
                    }
                });
            } else {
                console.log(`   . User ${u.username} already exists.`);
            }
        }
    }

    // 2. Legacy Transactions (Budget/Recurring)
    console.log('\n💰 Migrating Legacy Transactions (Cash Flow)...');
    try {
        const [txs] = await source.query('SELECT * FROM Transactions');
        console.log(`   Found ${txs.length} transactions.`);

        // Ensure "Transactions" table exists in Postgres (it should via Sequelize sync)

        if (!dryRun) {
            let migratedCount = 0;
            for (const tx of txs) {
                // Parse deductions if string
                let deductions = tx.deductions;
                if (typeof deductions === 'string') {
                    try { deductions = JSON.parse(deductions); } catch (e) { deductions = []; }
                }

                await target.query(`
                    INSERT INTO "Transactions" (id, "userId", name, amount, frequency, category, currency, date, type, deductions, "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), :userId, :name, :amount, :frequency, :category, :currency, :date, :type, :deductions, :createdAt, :updatedAt)
                `, {
                    replacements: {
                        userId: tx.userId,
                        name: tx.name,
                        amount: tx.amount,
                        frequency: tx.frequency,
                        category: tx.category,
                        currency: tx.currency || 'DOP',
                        date: tx.date,
                        type: tx.type,
                        deductions: JSON.stringify(deductions), // Postgres will cast to JSON
                        createdAt: tx.createdAt || new Date(),
                        updatedAt: tx.updatedAt || new Date()
                    }
                });
                migratedCount++;
            }
            console.log(`   ✅ Migrated ${migratedCount} transactions.`);
        }
    } catch (e) {
        console.error('   ❌ Error migrating transactions:', e.message);
    }

    console.log('\n✅ Migration Complete');
};

migrate();
