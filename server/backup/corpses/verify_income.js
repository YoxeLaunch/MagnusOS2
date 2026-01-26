
const API_URL = 'http://localhost:3001/api/transactions';

async function verifyIncome() {
    console.log('--- Verificando Ingresos para usuario "soberano" ---');

    const userId = 'soberano';

    try {
        // 1. List existing
        console.log(`\n[1] Listando ingresos actuales para userId=${userId}...`);
        const resInitial = await fetch(`${API_URL}?userId=${userId}`);
        const initial = await resInitial.json();

        console.log(`Encontrados: ${initial.length}`);
        initial.forEach(t => console.log(` - [${t.type}] ${t.name}: ${t.amount} (${t.userId})`));

        // 2. Create new Income (simulating frontend)
        console.log('\n[2] Creando nuevo ingreso (simulación)...');
        const newIncome = {
            id: Date.now().toString(),
            name: 'Ingreso_Prueba_' + Date.now(),
            amount: 1000,
            frequency: 'Mensual',
            category: 'Salario',
            currency: 'DOP',
            type: 'income',
            userId: userId // Simulating DataContext behavior
        };

        const resCreate = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newIncome)
        });

        if (!resCreate.ok) {
            throw new Error(`Failed to create: ${await resCreate.text()}`);
        }

        const created = await resCreate.json();
        console.log('✅ Creado:', created);

        // 3. Verify it exists via GET
        console.log('\n[3] Verificando si aparece en el listado...');
        const resAfter = await fetch(`${API_URL}?userId=${userId}`);
        const afterCreate = await resAfter.json();

        const found = afterCreate.find(t => t.id === created.id);

        if (found) {
            console.log('✅ ÉXITO: El ingreso se guardó y se recuperó correctamente.');
            console.log(`   Detalles: ${found.name} - UserID: ${found.userId}`);
        } else {
            console.error('❌ ERROR: El ingreso se creó pero NO aparece en el listado GET.');
            console.log('Listado actual:', JSON.stringify(afterCreate, null, 2));
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
    }
}

verifyIncome();
