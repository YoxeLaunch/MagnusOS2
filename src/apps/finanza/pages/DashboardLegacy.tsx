import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateTotalAnnual, calculateAnnualAmount, formatCurrency } from '../utils/calculations';
import { getFinancialCycle, isDateInCycle } from '../utils/financialCycle';
import { Printer, Activity, PieChart as PieChartIcon, TrendingUp, Receipt, PiggyBank, Flag, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { PrintOptionsModal, PrintOptions } from '../components/PrintOptionsModal';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';

import { BudgetVsRealityChart } from '../components/BudgetVsRealityChart';
import { HealthIndicators } from '../components/dashboard/HealthIndicators';
import { UpcomingBills } from '../components/dashboard/UpcomingBills';
import { MoneyInsight } from '../components/dashboard/MoneyInsight';
import { WealthWidget } from '../components/dashboard/WealthWidget';
import { InvestmentAllocation } from '../components/dashboard/InvestmentAllocation';
import { getDaysInMonth, getDaysElapsed } from '../utils/financialMetrics';
import { DashboardSkeleton } from '../../../shared/components/Skeleton';

export const Dashboard: React.FC = () => {
  const { data, dailyTransactions, currencies, isLoading } = useData();
  const navigate = useNavigate();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handlePrint = (options: PrintOptions) => {
    setIsPrintModalOpen(false);
    const params = new URLSearchParams();
    if (options.includeSummary) params.append('summary', 'true');
    if (options.includeBudget) params.append('budget', 'true');
    if (options.includeInvestments) params.append('investments', 'true');
    if (options.includeForecast) params.append('forecast', 'true');

    if (options.includeAccountStatement) {
      params.append('daily', 'true');
      if (options.startDate) params.append('start', options.startDate);
      if (options.endDate) params.append('end', options.endDate);
    }

    window.open(`/finanza/print?${params.toString()}`, '_blank');
  };

  const convertToDOP = (amount: number, currency?: string) => {
    if (currency === 'USD') return amount * (currencies?.usd?.rate || 1);
    if (currency === 'EUR') return amount * (currencies?.eur?.rate || 1);
    return amount;
  };

  // Calculate Real Stats (Current Financial Cycle)
  const realStats = useMemo(() => {
    const now = new Date();
    const currentCycle = getFinancialCycle(now);

    let income = 0;
    let expense = 0;
    let investment = 0;

    dailyTransactions.forEach(t => {
      const amountInDOP = convertToDOP(t.amount, t.currency);
      if (isDateInCycle(t.date, currentCycle)) {
        if (t.type === 'income') income += amountInDOP;
        else if (t.type === 'investment') investment += amountInDOP;
        else expense += amountInDOP;
      }
    });

    return { income, expense, investment, balance: income - expense - investment, cycleLabel: currentCycle.label };
  }, [dailyTransactions, currencies]);

  // Filter and Summary Calculations
  const { totalIncomeCurrent, totalExpenseCurrent, comparisonData, expenseChartData } = useMemo(() => {
    const START_DATE = new Date('2025-12-21');

    const incomes = (data.incomes || []).filter(t => new Date(t.date || '2025-12-21') >= START_DATE);
    const expenses = (data.expenses || []).filter(t => new Date(t.date || '2025-12-21') >= START_DATE);

    const totalIncome = incomes.reduce((acc, curr) => acc + (calculateAnnualAmount(curr, currencies) / 12), 0);
    const totalExpense = expenses.reduce((acc, curr) => acc + (calculateAnnualAmount(curr, currencies) / 12), 0);

    const compData = [
      { name: 'Ingresos', value: totalIncome, fill: '#3b82f6' },
      { name: 'Gastos', value: totalExpense, fill: '#ef4444' }
    ];

    const pieData = Object.values(expenses.reduce((acc: any, curr) => {
      const cat = curr.category || curr.name;
      if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
      acc[cat].value += (calculateAnnualAmount(curr, currencies) / 12);
      return acc;
    }, {}));

    return { totalIncomeCurrent: totalIncome, totalExpenseCurrent: totalExpense, comparisonData: compData, expenseChartData: pieData };
  }, [data, currencies]);

  // Time Metrics
  const now = new Date();
  const daysElapsed = getDaysElapsed(now);
  const totalDaysInMonth = getDaysInMonth(now);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <header>
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-wide">
            Centro de Comando
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono text-sm">
            Estado Financiero del Imperio &bull; {realStats.cycleLabel}
          </p>
        </header>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white/10 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 mr-2"
          >
            <Printer size={18} />
            <span className="font-bold text-sm hidden md:inline">Imprimir Informe</span>
          </button>
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
            <button className="px-4 py-1.5 bg-white dark:bg-slate-700 shadow-sm rounded-md text-sm font-bold text-blue-600 dark:text-white">Actual</button>
            <Link to="/finanza/proyecciones" className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Proyección</Link>
          </div>
        </div>
      </div>

      <PrintOptionsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onPrint={handlePrint}
      />


      {/* ROW 1: WEALTH WIDGET + HEALTH INDICATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Wealth Widget */}
        <WealthWidget
          totalWealth={realStats.balance + realStats.investment}
          invested={realStats.investment}
          available={realStats.balance}
          monthlyGrowth={0}
        />

        {/* Health Indicators - Take 3 columns */}
        <div className="lg:col-span-3">
          <HealthIndicators
            income={realStats.income}
            expense={realStats.expense}
            balance={250000}
            daysElapsed={daysElapsed}
            currentDate={now}
          />
        </div>
      </div>

      {/* ROW 2: MAIN VISUALIZATIONS + INVESTMENT ALLOCATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Balance del Periodo */}
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-500" size={20} />
            Balance del Periodo
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" tickFormatter={(val) => `$${val}`} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Investment Allocation */}
        <InvestmentAllocation
          investments={data.investments}
          currencies={currencies}
        />
      </div>

      {/* ROW 3: OPERATIONAL INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Bills */}
        <div className="lg:col-span-2">
          <UpcomingBills
            plannedExpenses={data.expenses}
            transactions={dailyTransactions}
            currentDate={now}
            currencies={currencies}
          />
        </div>

        {/* Money Insights */}
        <div className="lg:col-span-1">
          <MoneyInsight
            transactions={dailyTransactions}
            daysElapsed={daysElapsed}
            totalDays={totalDaysInMonth}
          />
        </div>
      </div>

      {/* ROW 4: BUDGET VS REALITY */}
      <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
        <BudgetVsRealityChart
          budget={Math.round(totalExpenseCurrent)}
          reality={realStats.expense}
        />
      </div>
    </div>
  );
};