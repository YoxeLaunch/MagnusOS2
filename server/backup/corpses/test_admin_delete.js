// Native fetch is used


const API_URL = 'http://localhost:3001/api';

async function verifyAdminDelete() {
    const testUser = {
        username: 'deleteme_test',
        password: 'password123',
        name: 'Delete Me Test',
        role: 'user'
    };

    console.log('1. Registering test user...');
    const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
    });

    if (!regRes.ok) {
        // If user exists from failed previous run, that's fine
        console.log('User might already exist or reg failed:', await regRes.text());
    } else {
        console.log('User registered.');
    }

    console.log('2. Adding a test transaction...');
    const txRes = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: testUser.username,
            name: 'Test Expense',
            amount: 100,
            frequency: 'One-time',
            type: 'Expense'
        })
    });
    console.log('Transaction add status:', txRes.status);

    console.log('3. Deleting the user...');
    const delRes = await fetch(`${API_URL}/users/${testUser.username}`, {
        method: 'DELETE'
    });
    const delData = await delRes.json();
    console.log('Delete response:', delData);

    console.log('4. Verifying user is gone...');
    const usersRes = await fetch(`${API_URL}/users`);
    const users = await usersRes.json();
    const foundUser = users.find(u => u.username === testUser.username);

    if (!foundUser) {
        console.log('SUCCESS: User not found in list.');
    } else {
        console.error('FAILURE: User still exists in list!');
    }

    console.log('5. Verifying transactions are gone (fetch by userId)...');
    const txCheckRes = await fetch(`${API_URL}/transactions?userId=${testUser.username}`);
    const transactions = await txCheckRes.json();

    if (transactions.length === 0) {
        console.log('SUCCESS: No transactions found for deleted user.');
    } else {
        console.error(`FAILURE: Found ${transactions.length} transactions!`);
    }
}

verifyAdminDelete().catch(console.error);
