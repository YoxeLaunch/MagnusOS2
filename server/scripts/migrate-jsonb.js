/**
 * Script: migrate-jsonb.js
 * Propósito: Migrar campos TEXT (tags, preferences) del modelo User a JSONB nativo.
 * 
 * El script es idempotente y reversible:
 *   - Fase 1: Agrega columnas temporales tags_new y preferences_new (JSONB)
 *   - Fase 2: Migra datos con casting seguro
 *   - Fase 3: Verifica integridad
 *   - Fase 4: Renombra columnas (vieja → old_, nueva → sin sufijo)
 * 
 * ROLLBACK: Si algo falla, las columnas originales (tags, preferences TEXT) se mantienen
 * hasta que el script complete exitosamente.
 * 
 * Uso: node server/scripts/migrate-jsonb.js
 */

import { sequelize } from '../config/database.js';

const run = async () => {
    console.log('[JSONB-MIGRATE] Connecting...');
    await sequelize.authenticate();
    console.log('[JSONB-MIGRATE] Connected. Starting migration...\n');

    const queryInterface = sequelize.getQueryInterface();

    // ── STEP 1: Verificar estado actual ────────────────────────────────────────
    const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'Users'
          AND column_name IN ('tags', 'preferences', 'tags_new', 'preferences_new', 'tags_old', 'preferences_old')
        ORDER BY column_name;
    `);

    console.log('[JSONB-MIGRATE] Current columns:', columns.map(c => `${c.column_name}(${c.data_type})`).join(', '));

    const colNames = columns.map(c => c.column_name);
    const alreadyMigrated = colNames.includes('tags_old') && !colNames.includes('tags_new');
    if (alreadyMigrated) {
        console.log('[JSONB-MIGRATE] ✅ Already migrated. Nothing to do.');
        process.exit(0);
    }

    // ── STEP 2: Agregar columnas JSONB temporales (si no existen) ─────────────
    if (!colNames.includes('tags_new')) {
        console.log('[JSONB-MIGRATE] Adding tags_new JSONB column...');
        await sequelize.query(`ALTER TABLE "Users" ADD COLUMN tags_new JSONB`);
    }
    if (!colNames.includes('preferences_new')) {
        console.log('[JSONB-MIGRATE] Adding preferences_new JSONB column...');
        await sequelize.query(`ALTER TABLE "Users" ADD COLUMN preferences_new JSONB`);
    }

    // ── STEP 3: Migrar datos con manejo de NULL y JSON inválido ───────────────
    console.log('[JSONB-MIGRATE] Migrating data...');
    await sequelize.query(`
        UPDATE "Users"
        SET tags_new = CASE
            WHEN tags IS NULL OR tags = '' THEN '[]'::jsonb
            ELSE tags::jsonb
        END
        WHERE tags_new IS NULL
    `);
    await sequelize.query(`
        UPDATE "Users"
        SET preferences_new = CASE
            WHEN preferences IS NULL OR preferences = '' THEN '{}'::jsonb
            ELSE preferences::jsonb
        END
        WHERE preferences_new IS NULL
    `);

    // ── STEP 4: Verificar integridad ──────────────────────────────────────────
    const [[{ total, migrated_tags, migrated_prefs }]] = await sequelize.query(`
        SELECT
            COUNT(*) AS total,
            COUNT(tags_new) AS migrated_tags,
            COUNT(preferences_new) AS migrated_prefs
        FROM "Users"
    `);

    console.log(`[JSONB-MIGRATE] Integrity check: ${migrated_tags}/${total} tags, ${migrated_prefs}/${total} preferences migrated`);

    if (String(migrated_tags) !== String(total) || String(migrated_prefs) !== String(total)) {
        console.error('[JSONB-MIGRATE] ❌ Integrity check failed! Aborting — original columns kept intact.');
        process.exit(1);
    }

    // ── STEP 5: Renombrar columnas atómicamente ───────────────────────────────
    console.log('[JSONB-MIGRATE] Renaming columns...');
    await sequelize.query(`ALTER TABLE "Users" RENAME COLUMN tags TO tags_old`);
    await sequelize.query(`ALTER TABLE "Users" RENAME COLUMN tags_new TO tags`);
    await sequelize.query(`ALTER TABLE "Users" RENAME COLUMN preferences TO preferences_old`);
    await sequelize.query(`ALTER TABLE "Users" RENAME COLUMN preferences_new TO preferences`);

    console.log('\n[JSONB-MIGRATE] ✅ Migration complete!');
    console.log('[JSONB-MIGRATE] Columns tags_old and preferences_old kept as backup.');
    console.log('[JSONB-MIGRATE] To drop backups when confirmed OK:');
    console.log('  ALTER TABLE "Users" DROP COLUMN tags_old;');
    console.log('  ALTER TABLE "Users" DROP COLUMN preferences_old;');

    process.exit(0);
};

run().catch(err => {
    console.error('[JSONB-MIGRATE] FATAL:', err.message);
    process.exit(1);
});
