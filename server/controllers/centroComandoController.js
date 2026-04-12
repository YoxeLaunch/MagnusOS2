import { DailyTransaction, WealthSnapshot, CurrencyHistory } from '../models/index.js';
import { Op } from 'sequelize';

// Financial Cycle helpers ported from frontend
const getFinancialCycle = (referenceDate) => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const day = referenceDate.getDate();

    if (year === 2025 && month === 11) {
        return { start: new Date(2025, 11, 1), end: new Date(2026, 0, 25), label: 'Enero' };
    }
    if (year === 2026 && month === 0 && day <= 25) {
        return { start: new Date(2025, 11, 1), end: new Date(2026, 0, 25), label: 'Enero' };
    }

    if (day >= 26) {
        const start = new Date(year, month, 26);
        const end = new Date(year, month + 1, 25);
        const labelDate = new Date(year, month + 1, 1);
        return { start, end, label: labelDate.toLocaleDateString('es-ES', { month: 'long' }) };
    } else {
        const start = new Date(year, month - 1, 26);
        const end = new Date(year, month, 25);
        const labelDate = new Date(year, month, 1);
        return { start, end, label: labelDate.toLocaleDateString('es-ES', { month: 'long' }) };
    }
};

const getCycleId = (dateStr) => {
    const date = new Date(dateStr);
    const cycle = getFinancialCycle(date);
    const year = cycle.end.getFullYear();
    const month = cycle.end.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
};

const getCycleFromId = (cycleId) => {
    const [yearStr, monthStr] = cycleId.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    if (year === 2026 && month === 0) {
        return { start: new Date(2025, 11, 1), end: new Date(2026, 0, 25), label: 'Enero' };
    }
    if (year === 2025 && month === 11) {
        return { start: new Date(2025, 10, 26), end: new Date(2025, 10, 30), label: 'Diciembre' };
    }

    const end = new Date(year, month, 25);
    const start = new Date(year, month - 1, 26);
    const labelDate = new Date(year, month, 1);
    return { start, end, label: labelDate.toLocaleDateString('es-ES', { month: 'long' }) };
};

// --- CONTROLLERS ---

export const getCiclos = async (req, res) => {
    try {
        const userId = req.user.username;
        const year = parseInt(req.query.year || new Date().getFullYear());
        const startOfYear = new Date(year - 1, 10, 26); // Cover any previous year overlaps
        const endOfYear = new Date(Math.max(year + 1, new Date().getFullYear()), 1, 25); 

        const transactions = await DailyTransaction.findAll({
            where: { 
                userId,
                date: { [Op.between]: [startOfYear, endOfYear] } 
            },
            attributes: ['date'],
            raw: true
        });

        const cycleIds = new Set();
        transactions.forEach(t => cycleIds.add(getCycleId(t.date)));

        // Always include current cycle
        cycleIds.add(getCycleId(new Date().toISOString()));

        const result = Array.from(cycleIds)
            .map(id => {
                const cycle = getCycleFromId(id);
                return {
                    id,
                    label: `${cycle.label} (${cycle.start.getDate()} ${cycle.start.toLocaleDateString('es-ES',{month:'short'})} – ${cycle.end.getDate()} ${cycle.end.toLocaleDateString('es-ES',{month:'short'})})`,
                    start: cycle.start,
                    end: cycle.end
                };
            })
            // Only return cycles that technically end in the given year
            .filter(c => c.end.getFullYear() === year)
            .sort((a, b) => b.id.localeCompare(a.id));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAnual = async (req, res) => {
    try {
        const userId = req.user.username;
        const year = parseInt(req.query.year || new Date().getFullYear());
        
        // Use all available transactions for YTD calculation of this year
        const transactions = await DailyTransaction.findAll({ 
            where: { userId },
            raw: true 
        });
        
        const yearTxs = transactions.filter(t => new Date(t.date).getFullYear() === year || getCycleFromId(getCycleId(t.date)).end.getFullYear() === year);

        let totalEntradas = 0;
        let totalGastos = 0;
        let totalInvertido = 0;

        const cycleMap = {};
        const inversionCategoryMap = {};
        const allCycles = new Set();

        yearTxs.forEach(t => {
            const amount = Number(t.amount);
            const type = t.type;
            const cycleId = getCycleId(t.date);
            const cycleEndYear = getCycleFromId(cycleId).end.getFullYear();
            
            if (cycleEndYear !== year) return;
            allCycles.add(cycleId);
            
            if (!cycleMap[cycleId]) {
                cycleMap[cycleId] = { id: cycleId, entradas: 0, gastos: 0, invertido: 0, label: getCycleFromId(cycleId).label };
            }

            if (type === 'income') { totalEntradas += amount; cycleMap[cycleId].entradas += amount; }
            else if (type === 'gasto' || type === 'expense') { totalGastos += amount; cycleMap[cycleId].gastos += amount; }
            else if (type === 'inversion' || type === 'investment') { 
                totalInvertido += amount; cycleMap[cycleId].invertido += amount; 
                inversionCategoryMap[t.category || 'General'] = (inversionCategoryMap[t.category || 'General'] || 0) + amount;
            }
        });

        const ciclosSorted = Array.from(allCycles).sort().map(id => {
            const c = cycleMap[id];
            return {
                cicloId: id,
                label: c.label,
                entradas: c.entradas,
                gastos: c.gastos,
                invertido: c.invertido,
                ahorroNeto: c.entradas - c.gastos - c.invertido,
                tasaAhorro: c.entradas > 0 ? (c.entradas - c.gastos - c.invertido) / c.entradas : 0
            };
        });

        const tasaAhorroPorCiclo = ciclosSorted.map(c => ({ cicloId: c.cicloId, label: c.label, tasaAhorro: c.tasaAhorro }));
        const tasaPromedio = tasaAhorroPorCiclo.reduce((acc, c) => acc + c.tasaAhorro, 0) / (tasaAhorroPorCiclo.length || 1);

        // Runway logic
        const startYearDate = new Date(year, 0, 1);
        const daysPassed = Math.max((new Date() - startYearDate) / (1000 * 60 * 60 * 24), 1);
        const burnRateDiario = totalGastos / daysPassed;

        // Cash global
        let cashGlobal = 0;
        transactions.forEach(t => {
             const amt = Number(t.amount);
             if (t.type==='income') cashGlobal += amt;
             else if(t.type==='expense'||t.type==='gasto') cashGlobal -= amt;
             else if(t.type==='investment'||t.type==='inversion') cashGlobal -= amt;
        });

        const runwayDias = burnRateDiario > 0 ? cashGlobal / burnRateDiario : 0;

        res.json({
            patrimonioNeto: cashGlobal + totalInvertido,
            totalEntradas,
            totalGastos,
            totalInvertido,
            liquidezActual: cashGlobal,
            tasaAhorroPromedio: tasaPromedio,
            burnRateDiario,
            runwayDias,
            ciclosPorMes: ciclosSorted,
            inversionPorCategoria: Object.entries(inversionCategoryMap).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value),
            tasaAhorroPorCiclo
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

export const getMensual = async (req, res) => {
    try {
        const userId = req.user.username;
        const { cicloId } = req.query;
        if (!cicloId) return res.status(400).json({ error: 'cicloId is required' });

        const cycle = getCycleFromId(cicloId);
        
        // Find previous cycle for comparison
        let [yearStr, monthStr] = cicloId.split('-');
        let prevYear = parseInt(yearStr);
        let prevMonth = parseInt(monthStr) - 1;
        if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
        const prevCicloId = `${prevYear}-${String(prevMonth).padStart(2,'0')}`;
        const prevCycle = getCycleFromId(prevCicloId);

        const transactions = await DailyTransaction.findAll({ 
            where: { userId },
            raw: true 
        });
        
        let entradas = 0; let gastos = 0; let invertido = 0;
        let pEntradas = 0; let pGastos = 0; let pInvertido = 0;
        let gastosCatMap = {};

        // Calculate global to date
        let cashGlobal = 0;
        let inversionAcumulada = 0;

        transactions.forEach(t => {
            const amt = Number(t.amount);
            const type = t.type;
            const tDate = new Date(t.date);
            const tCycleId = getCycleId(t.date);

            // Global
            if (type === 'income') cashGlobal += amt;
            else if (type === 'expense' || type === 'gasto') cashGlobal -= amt;
            else if (type === 'investment' || type === 'inversion') { 
                cashGlobal -= amt; 
                inversionAcumulada += amt; 
            }

            // Current Cycle
            if (tCycleId === cicloId) {
                if (type === 'income') entradas += amt;
                else if (type === 'expense' || type === 'gasto') {
                    gastos += amt;
                    let cat = t.category || 'Varios';
                    gastosCatMap[cat] = (gastosCatMap[cat] || 0) + amt;
                }
                else if (type === 'investment' || type === 'inversion') invertido += amt;
            }

            // Previous Cycle
            if (tCycleId === prevCicloId) {
                if (type === 'income') pEntradas += amt;
                else if (type === 'expense' || type === 'gasto') pGastos += amt;
                else if (type === 'investment' || type === 'inversion') pInvertido += amt;
            }
        });

        const ahorroNeto = entradas - gastos - invertido;
        const pAhorroNeto = pEntradas - pGastos - pInvertido;

        const tasaAhorro = entradas > 0 ? ahorroNeto / entradas : 0;
        
        // days passed in cycle
        const now = new Date();
        const cycleDays = Math.max((cycle.end - cycle.start)/(1000*60*60*24), 1);
        let daysPassed = cycleDays;
        if (now >= cycle.start && now <= cycle.end) {
            daysPassed = Math.max((now - cycle.start)/(1000*60*60*24), 1);
        } else if (now < cycle.start) {
            daysPassed = 1;
        }
        
        const burnRateDiario = gastos / daysPassed;
        const runwayDias = burnRateDiario > 0 ? cashGlobal / burnRateDiario : 0;

        const deltaEntradas = pEntradas > 0 ? ((entradas - pEntradas) / pEntradas) * 100 : 0;
        const deltaGastos = pGastos > 0 ? ((gastos - pGastos) / pGastos) * 100 : 0;
        const deltaAhorro = pAhorroNeto > 0 ? ((ahorroNeto - pAhorroNeto) / pAhorroNeto) * 100 : 0;

        res.json({
            cicloId,
            cicloLabel: `${cycle.label} (${cycle.start.getDate()} ${cycle.start.toLocaleDateString('es-ES',{month:'short'})} – ${cycle.end.getDate()} ${cycle.end.toLocaleDateString('es-ES',{month:'short'})})`,
            entradas,
            gastos,
            invertido,
            ahorroNeto,
            tasaAhorro,
            burnRateDiario,
            runwayDias,
            cashGlobal,
            inversionAcumulada,
            gastosPorCategoria: Object.entries(gastosCatMap).map(([name, total]) => ({ category: name, total })).sort((a,b)=>b.total-a.total).slice(0, 6),
            comparativoCicloAnterior: {
                deltaEntradas,
                deltaGastos,
                deltaAhorro
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
