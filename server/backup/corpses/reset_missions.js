import { initSystemDb, Mission } from '../models/system/index.js';

const reset = async () => {
    await initSystemDb();
    console.log('Resetting all missions to incomplete...');
    await Mission.update({ isCompleted: false }, { where: {} });
    console.log('Done.');
};

reset();
