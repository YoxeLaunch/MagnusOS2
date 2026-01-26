const http = require('http');

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body ? JSON.parse(body) : null);
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testPersistence() {
    console.log('--- Iniciando Prueba de Persistencia ---');

    // 1. Create Daily Transaction
    console.log('\n[1] Creando transacción de prueba...');
    const testData = {
        date: '2025-12-25',
        amount: 500,
        description: 'Prueba de Persistencia',
        type: 'expense',
        category: 'Test'
    };

    try {
        const created = await request('POST', '/api/daily-transactions', testData);
        console.log('✅ Creado con ID:', created.id);

        // 2. Verify it exists
        console.log('\n[2] Verificando existencia en base de datos...');
        const allTransactions = await request('GET', '/api/daily-transactions');
        const found = allTransactions.find(t => t.id === created.id);

        if (found) {
            console.log('✅ Transacción encontrada en DB:', found.description);
        } else {
            throw new Error('❌ Transacción NO encontrada después de crearla');
        }

        // 3. Delete Transaction
        console.log('\n[3] Eliminando transacción...');
        await request('DELETE', `/api/daily-transactions/${created.id}`);
        console.log('✅ Eliminada correctamente');

        // 4. Verify it's gone
        console.log('\n[4] Verificando eliminación...');
        const afterDelete = await request('GET', '/api/daily-transactions');
        const stillExists = afterDelete.find(t => t.id === created.id);

        if (!stillExists) {
            console.log('✅ Transacción ya no existe en DB');
            console.log('\n--- prueba EXITOSA: La persistencia funciona correctamente ---');
        } else {
            throw new Error('❌ Transacción SIGUE existiendo después de eliminarla');
        }

    } catch (error) {
        console.error('\n❌ FALLO EN LA PRUEBA:', error.message);
        process.exit(1);
    }
}

testPersistence();
