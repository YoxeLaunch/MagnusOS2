
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../server/data/magnus_system.db');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

const inspect = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to magnus_system.db');

        const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables:', tables.map(t => t.name));

        for (const t of tables) {
            if (t.name === 'sqlite_sequence') continue;
            const [count] = await sequelize.query(`SELECT count(*) as count FROM "${t.name}"`);
            console.log(`- ${t.name}: ${count[0].count} rows`);

            // Show first row to understand schema
            const [first] = await sequelize.query(`SELECT * FROM "${t.name}" LIMIT 1`);
            if (first.length > 0) {
                console.log('  Sample:', JSON.stringify(first[0]));
            }
        }

    } catch (e) {
        console.error(e);
    }
};

inspect();
