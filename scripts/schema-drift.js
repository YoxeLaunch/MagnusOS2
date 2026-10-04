#!/usr/bin/env node
import { sequelize } from '../server/models/index.js';
import { SchemaDriftService } from '../server/services/schemaDriftService.js';

try {
    const result = await new SchemaDriftService(sequelize).audit();
    console.log(JSON.stringify(result, null, 2));
    if (!result.isSynced) process.exitCode = 1;
} catch (error) {
    console.error('Schema drift audit failed:', error.message);
    process.exitCode = 1;
} finally {
    await sequelize.close();
}
