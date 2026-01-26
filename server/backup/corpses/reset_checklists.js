import { initSystemDb, UserChecklist } from '../models/system/index.js';

const resetChecklist = async () => {
    try {
        await initSystemDb();
        console.log('--- Resetting User Checklists ---');
        await UserChecklist.destroy({ where: {} });
        console.log('All checklists wiped. Progress should be 0%.');
    } catch (e) {
        console.error(e);
    }
};

resetChecklist();
