import fs from 'fs';
import { SystemUpdate } from '../models/system/index.js';
import { JSON_DB_PATHS } from '../config/database.js';

export const migrateUpdates = async () => {
    try {
        const count = await SystemUpdate.count();
        if (count > 0) {
            console.log('[MIGRATION] SystemUpdates table not empty. Skipping migration.');
            return;
        }

        if (!fs.existsSync(JSON_DB_PATHS.UPDATES)) {
            console.log('[MIGRATION] updates.json not found. Skipping.');
            return;
        }

        const rawData = fs.readFileSync(JSON_DB_PATHS.UPDATES, 'utf-8');
        const updates = JSON.parse(rawData);

        console.log(`[MIGRATION] Found ${updates.length} updates in JSON. Migrating...`);

        for (const update of updates) {
            await SystemUpdate.create({
                title: update.title,
                description: update.description,
                type: update.type,
                date: update.date,
                isPublished: true
            });
        }

        console.log('[MIGRATION] SystemUpdates migrated successfully.');

    } catch (error) {
        console.error('[MIGRATION] Failed to migrate updates:', error);
    }
};
