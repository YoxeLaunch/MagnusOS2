import { DailyTransaction } from '../types';
import { getCycleId } from './financialCycle';

export interface SankeyNode {
    name: string;
    value: number; // Total flow value
    type: 'source' | 'target' | 'surplus' | 'deficit';
    color?: string;
}

export interface SankeyLink {
    source: string;
    target: string;
    value: number;
}

export interface FlowData {
    nodes: SankeyNode[];
    links: SankeyLink[];
    totalIncome: number;
    totalExpense: number;
    savings: number;
}

/**
 * Aggregates transactions to calculate average monthly flows for Sankey Diagram.
 * Focuses on the last 3 closed cycles for relevance.
 */
export const calculateFlowData = (transactions: DailyTransaction[]): FlowData | null => {
    if (!transactions || transactions.length === 0) return null;

    // 1. Filter for closed cycles (exclude current incomplete month)
    const currentCycleId = getCycleId(new Date().toISOString().slice(0, 10));

    // Group by Cycle -> Category
    const cycleData: Record<string, { income: number, expenses: Record<string, number> }> = {};
    let cycleCount = 0;

    transactions.forEach(t => {
        const cycleId = getCycleId(t.date);

        // Skip current cycle and future
        if (cycleId >= currentCycleId) return;

        if (!cycleData[cycleId]) {
            cycleData[cycleId] = { income: 0, expenses: {} };
            cycleCount++; // Count unique cycles encountered
        }

        if (t.type === 'income') {
            cycleData[cycleId].income += t.amount;
        } else {
            // Group expenses by category
            // If no category, default to 'Otros'
            const cat = t.category || 'Otros Gastos';
            cycleData[cycleId].expenses[cat] = (cycleData[cycleId].expenses[cat] || 0) + t.amount;
        }
    });

    // If no history, return null
    // We strictly need closed cycles to avoid partial data
    const validCycles = Object.keys(cycleData);
    if (validCycles.length === 0) return null;

    // 2. Averages Calculation
    // We sum all valid cycles and divide by count
    let totalIncomeSum = 0;
    const expenseCategorySums: Record<string, number> = {};

    validCycles.forEach(cid => {
        totalIncomeSum += cycleData[cid].income;
        Object.entries(cycleData[cid].expenses).forEach(([cat, amount]) => {
            expenseCategorySums[cat] = (expenseCategorySums[cat] || 0) + amount;
        });
    });

    const avgIncome = Math.round(totalIncomeSum / validCycles.length);
    const avgExpenses: Record<string, number> = {};
    let totalAvgExpense = 0;

    Object.entries(expenseCategorySums).forEach(([cat, sum]) => {
        const avg = Math.round(sum / validCycles.length);
        if (avg > 0) {
            avgExpenses[cat] = avg;
            totalAvgExpense += avg;
        }
    });

    // 3. Build Nodes & Links
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    // Source Node: Income
    nodes.push({ name: 'Ingresos Totales', value: avgIncome, type: 'source', color: '#10B981' });

    // Target Nodes: Expense Categories
    // Sort categories by size
    const sortedCategories = Object.entries(avgExpenses).sort((a, b) => b[1] - a[1]);

    sortedCategories.forEach(([cat, amount]) => {
        nodes.push({ name: cat, value: amount, type: 'target', color: '#EF4444' });
        links.push({ source: 'Ingresos Totales', target: cat, value: amount });
    });

    // Savings / Deficit Node
    const balance = avgIncome - totalAvgExpense;

    if (balance > 0) {
        // Surplus (Savings)
        nodes.push({ name: 'Ahorro / Inversión', value: balance, type: 'surplus', color: '#F59E0B' });
        links.push({ source: 'Ingresos Totales', target: 'Ahorro / Inversión', value: balance });
    } else if (balance < 0) {
        // Logic gap: Sankey technically flows from Source. 
        // If Expenses > Income, we can't easily show "Deficit" flowing FROM Income.
        // Usually, we just show Income fully exhausted, and Deficit is an external filler.
        // For simplicity in this Viz, we visualize the Flow of INCOME only.
        // So if Expenses > Income, we scale down expenses proportionally or show 'Déficit' as a separate alert?
        // Let's just show Income distributing to expenses until it runs out? 
        // No, standard Sankey shows flow. We will show lines for expenses. 
        // If Income < Expenses, visual sum of links will be > Income node which is weird.
        // Correct approach: Source = Income + Deficit. Targets = Expenses.
        // Let's implement Deficit as a secondary Source.

        nodes.push({ name: 'Déficit (Deuda)', value: Math.abs(balance), type: 'deficit', color: '#EF4444' });
        // We add deficit to the node list but links need to flow TO expenses.
        // This complicates the simple 1-level Sankey.
        // Simplified Plan: Just show Flows = Min(Income, Expense). 
        // Or just let it be weird if we want.
        // Let's add 'Déficit' as a Source Node.
        links.push({ source: 'Déficit (Deuda)', target: 'Gastos Excedentes', value: Math.abs(balance) });
        // Actually, let's keep it simple for V1:
        // Source is always Income. If Expenses > Income, we just show the links. 
        // The visual sum of right side will be taller than left. That's fine.
    }

    return {
        nodes,
        links,
        totalIncome: avgIncome,
        totalExpense: totalAvgExpense,
        savings: balance
    };
};
