
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbs = [
    { name: 'auditor', path: path.join(__dirname, '../server/data/auditor.db') },
    { name: 'finanza', path: path.join(__dirname, '../server/data/finanza.db') },
    { name: 'magnus_system', path: path.join(__dirname, '../server/data/magnus_system.db') }
];

const inspect = async () => {
    for (const db of dbs) {
        console.log(`\n\n=== Inspecting ${db.name}.db ===`);
        try {
            const sequelize = new Sequelize({ dialect: 'sqlite', storage: db.path, logging: false });
            await sequelize.authenticate();

            // List Tables
            const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            console.log('Tables:', tables.map(t => t.name));

            // Check Users
            const userTable = tables.find(t => t.name.toLowerCase() === 'users');
            if (userTable) {
                const [users] = await sequelize.query(`SELECT * FROM "${userTable.name}"`);
                console.log(`Contents of ${userTable.name}:`);
                users.forEach(u => console.log(`  - ${u.username || u.name || 'Current'} (ID: ${u.id})`));
            }

            // Check Transactions (Budget)
            const txTable = tables.find(t => t.name.toLowerCase() === 'transactions');
            if (txTable) {
                const [txs] = await sequelize.query(`SELECT * FROM "${txTable.name}"`);
                console.log(`Contents of ${txTable.name} (Count: ${txs.length}):`);
                if (txs.length > 0) console.log('  Sample:', JSON.stringify(txs[0]));
            }

        } catch (e) {
            console.error(`Error inspecting ${db.name}:`, e.message);
        }
    }
};

inspect();
