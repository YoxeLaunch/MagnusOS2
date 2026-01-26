import fs from 'fs';
import path from 'path';
import { User } from '../models/index.js';
import { Mentor, UserChecklist, UserCalendar } from '../models/system/index.js';
import { JSON_DB_PATHS } from '../config/database.js';

export const migrateData = async () => {
    console.log('[MIGRATION] Starting JSON -> SQLite migration...');

    try {
        // 1. Migrate Users
        if (fs.existsSync(JSON_DB_PATHS.DB)) {
            const dbData = JSON.parse(fs.readFileSync(JSON_DB_PATHS.DB, 'utf8'));
            const users = dbData.users || [];

            if (users.length > 0) {
                const count = await User.count();
                if (count === 0) {
                    console.log(`[MIGRATION] Found ${users.length} users in JSON. Migrating...`);
                    await User.bulkCreate(users);
                    console.log('[MIGRATION] Users migrated.');
                } else {
                    console.log('[MIGRATION] Users table not empty, skipping JSON migration.');
                }
            }

            // Checklist
            const checklist = dbData.checklist || [];
            if (checklist.length > 0) {
                const count = await UserChecklist.count();
                if (count === 0) {
                    // Since old JSON checklist didn't have userId, assume 'soberano'? 
                    // Or just migrate generically. Old system logic was singletenant effectively or tied to single DB file.
                    // We will map them to 'soberano' if no user logic exists, or just store them. 
                    // Actually old db.checklist was global. Let's assign to 'soberano' as default admin.
                    const mapped = checklist.map(item => ({
                        text: item.text,
                        completed: item.checked,
                        userId: 'soberano'
                    }));
                    await UserChecklist.bulkCreate(mapped);
                    console.log('[MIGRATION] Checklist migrated.');
                }
            }

            // Calendar
            const calendar = dbData.calendar || {};
            const dates = Object.keys(calendar);
            if (dates.length > 0) {
                const count = await UserCalendar.count();
                if (count === 0) {
                    const mapped = dates.map(date => ({
                        date,
                        value: calendar[date],
                        userId: 'soberano'
                    }));
                    await UserCalendar.bulkCreate(mapped);
                    console.log('[MIGRATION] Calendar migrated.');
                }
            }
        }

        // 2. Migrate Mentors
        if (fs.existsSync(JSON_DB_PATHS.MENTORS)) {
            const mentors = JSON.parse(fs.readFileSync(JSON_DB_PATHS.MENTORS, 'utf8'));
            if (mentors.length > 0) {
                const count = await Mentor.count();
                if (count === 0) {
                    console.log(`[MIGRATION] Found ${mentors.length} mentors in JSON. Migrating...`);
                    await Mentor.bulkCreate(mentors);
                    console.log('[MIGRATION] Mentors migrated.');
                }
            }
        }

    } catch (error) {
        console.error('[MIGRATION] Error during migration:', error);
    }
};
