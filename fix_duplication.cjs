const fs = require('fs');
const path = 'c:/Magnus/SistemaM/src/apps/finanza/pages/CashFlow.tsx';

try {
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');

    // Expected duplicate block range: 412 to 488 (1-based)
    // Arrays are 0-based, so 411 to 487.

    // Safety check with strict content matching
    const startLine = 411; // Line 412
    const endLine = 487;   // Line 488

    const startContent = lines[startLine].trim();
    if (!startContent.startsWith("{newIncome.category === 'Salario' && (")) {
        console.error('Start line mismatch:', startContent);
        process.exit(1);
    }

    const endContent = lines[endLine].trim();
    if (endContent !== ')}') {
        console.error('End line mismatch:', endContent);
        process.exit(1);
    }

    lines.splice(startLine, (endLine - startLine + 1));

    const newData = lines.join('\n');
    fs.writeFileSync(path, newData);
    console.log('Successfully removed duplicate block.');

} catch (err) {
    console.error(err);
    process.exit(1);
}
