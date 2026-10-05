#!/usr/bin/env node
import { sequelize } from '../server/models/index.js';
import { MigrationRunner } from '../server/services/migrationRunner.js';

const command = process.argv[2] || 'status';
const dryRun = process.argv.includes('--dry-run');
const confirmBaseline = process.argv.includes('--confirm-baseline');

async function main() {
    const runner = new MigrationRunner(sequelize);

    try {
        if (command === 'status') {
            console.log('=== MAGNUSOS2 MIGRATION STATUS ===');
            const status = await runner.status();
            console.table(status.map(s => ({
                Migration: s.name,
                Applied: s.applied ? 'YES' : 'NO',
                'Applied At': s.appliedAt ? new Date(s.appliedAt).toISOString() : '-',
                'Checksum OK': s.applied ? (s.checksumMatches ? 'VALID' : 'MISMATCH') : 'PENDING'
            })));
        } else if (command === 'up') {
            console.log(`=== RUNNING MIGRATIONS ${dryRun ? '(DRY RUN)' : ''} ===`);
            const res = await runner.up({ dryRun });
            console.log(`Applied ${res.appliedCount} migration(s).`);
            res.results.forEach(r => {
                console.log(` - ${r.name}: ${r.status}`);
            });
        } else if (command === 'baseline') {
            const name = process.argv[3];
            const result = await runner.markBaseline(name, { confirmed: confirmBaseline });
            console.log(`${result.name}: ${result.status}`);
        } else {
            console.error(`Unknown command: ${command}. Available: status, up [--dry-run], baseline 000_base_schema.sql --confirm-baseline`);
            process.exit(1);
        }
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();
