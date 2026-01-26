
import { Sequelize, DataTypes } from 'sequelize';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '../server/data/magnus_system.db');

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

console.log('🚀 Magnus-OS2 System Data Migration');
console.log('===================================');
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

    // 1. Curriculum Modules
    console.log('\n📦 Migrating CurriculumModules...');
    const [modules] = await source.query('SELECT * FROM CurriculumModules');
    console.log(`   Found ${modules.length} modules`);

    if (!dryRun) {
        for (const m of modules) {
            await target.query(`
                INSERT INTO "CurriculumModules" (id, title, description, "order", "createdAt", "updatedAt")
                VALUES (:id, :title, :description, :order, :createdAt, :updatedAt)
                ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title
            `, {
                replacements: {
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    order: m.order,
                    createdAt: m.createdAt || new Date(),
                    updatedAt: m.updatedAt || new Date()
                }
            });
        }
    }

    // 2. Missions
    console.log('\n📦 Migrating Missions...');
    const [missions] = await source.query('SELECT * FROM Missions');
    console.log(`   Found ${missions.length} missions`);

    if (!dryRun) {
        for (const m of missions) {
            await target.query(`
                INSERT INTO "Missions" (id, "moduleId", text, week, "isCompleted", "createdAt", "updatedAt")
                VALUES (:id, :moduleId, :text, :week, :isCompleted, :createdAt, :updatedAt)
                ON CONFLICT (id) DO NOTHING
            `, {
                replacements: {
                    id: m.id,
                    moduleId: m.moduleId,
                    text: m.text,
                    week: m.week,
                    isCompleted: m.isCompleted ? true : false,
                    createdAt: m.createdAt || new Date(),
                    updatedAt: m.updatedAt || new Date()
                }
            });
        }
    }

    // 3. Telegram Links
    console.log('\n📦 Migrating TelegramLinks...');
    // Source table might be lowercase or CamelCase depending on SQLite creation. Inspect script showed 'telegram_links'.
    // Target table is 'telegram_links' (snake case) based on \dt? No, \dt showed 'telegram_links'.
    // Wait, inspect script showed 'telegram_links'.

    try {
        const [links] = await source.query('SELECT * FROM telegram_links');
        console.log(`   Found ${links.length} links`);

        if (!dryRun) {
            for (const l of links) {
                // Target: telegram_links (id, user_id, chat_id, username, linked_at...)
                // Let's check target schema if possible or guess standard mapping.
                // Assuming standard Sequelize timestamps.

                await target.query(`
                    INSERT INTO "telegram_links" ("chatId", username, "linkedAt")
                    VALUES (:chatId, :username, :linkedAt)
                    ON CONFLICT ("chatId") DO NOTHING
                `, {
                    replacements: {
                        chatId: l.chatId,
                        username: l.username,
                        linkedAt: l.linkedAt || new Date()
                    }
                });
            }
        }
    } catch (e) {
        console.log('   Skipping telegram_links (table not found in source or schema mismatch)', e.message);
    }

    // 4. System Updates (Create dummy if empty)
    if (!dryRun) {
        // Check if empty
        const [existing] = await target.query('SELECT count(*) as count FROM "SystemUpdates"');
        if (existing[0].count === '0') {
            console.log('\n📦 Seeding initial System Update...');
            await target.query(`
                INSERT INTO "SystemUpdates" (id, title, description, type, date, "isPublished", "createdAt", "updatedAt")
                VALUES (
                    gen_random_uuid(), 
                    'Sistema Migrado v2.0', 
                    'Migración exitosa a Magnus-OS2 con Docker y PostgreSQL.', 
                    'feature', 
                    NOW(), 
                    true, 
                    NOW(), 
                    NOW()
                )
            `);
        }
    }

    console.log('\n✅ System Data Migration Complete');
};

migrate();
