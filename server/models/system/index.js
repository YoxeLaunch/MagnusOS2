import { sequelizeSystem } from '../../config/database.js';
import { SystemUpdate } from './SystemUpdate.js';
import { createAppSettingsModel } from './AppSettings.js';
import { Mentor } from '../mentor.js';
import { UserChecklist, UserCalendar } from '../userData.js';
import { Message } from '../message.js';
import { CurriculumModule, Mission } from './Curriculum.js';
import TelegramLink from '../TelegramLink.js';

export const initSystemDb = async () => {
    try {
        await sequelizeSystem.sync();
        console.log('[SYSTEM DB] Database synced (SQLite)');
    } catch (error) {
        console.error('[SYSTEM DB] Error syncing database:', error);
        throw error;
    }
};

// Initialize AppSettings model
export const AppSettings = createAppSettingsModel(sequelizeSystem);

export {
    SystemUpdate,
    Mentor,
    UserChecklist,
    UserCalendar,
    Message,
    CurriculumModule,
    Mission,
    TelegramLink,
    sequelizeSystem
};

