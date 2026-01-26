/**
 * RiskAlert Component
 * 
 * Analyzes projection data to identify potential financial risks
 * such as low savings rate, dwindling runway, or expense growth outpacing income.
 */

import React from 'react';
import { AlertTriangle, AlertOctagon, TrendingUp } from 'lucide-react';

interface RiskAlertProps {
    savingsRate: number;
    cashRunway: number;
    financialDiscipline: number;
    incomeTrend: number; // Slope
    expenseTrend: number; // Slope
}

export const RiskAlert: React.FC<RiskAlertProps> = ({
    savingsRate,
    cashRunway,
    financialDiscipline,
    incomeTrend,
    expenseTrend
}) => {
    const alerts: { title: string; desc: string; severity: 'high' | 'medium'; icon: any }[] = [];

    // Rule 1: Low Savings Rate
    if (savingsRate < 10) {
        alerts.push({
            title: 'Tasa de Ahorro Crítica',
            desc: `Tu tasa de ahorro promedio proyectada es del ${savingsRate}%, por debajo del mínimo recomendado del 10%.`,
            severity: savingsRate < 0 ? 'high' : 'medium',
            icon: AlertTriangle
        });
    }

    // Rule 2: Short Cash Runway
    if (cashRunway < 3) {
        alerts.push({
            title: 'Pista de Efectivo Corta',
            desc: `Solo tienes ${cashRunway} meses de cobertura con tus ahorros actuales. Se recomienda un fondo de emergencia de 3-6 meses.`,
            severity: cashRunway < 1 ? 'high' : 'medium',
            icon: AlertOctagon
        });
    }

    // Rule 3: Expense Growth > Income Growth
    // Only check if trends are valid numbers
    if (expenseTrend > incomeTrend && expenseTrend > 0) {
        alerts.push({
            title: 'Tendencia de Gastos Preocupante',
            desc: 'Tus gastos están creciendo más rápido que tus ingresos. Esto podría llevar a un déficit a largo plazo.',
            severity: 'medium',
            icon: TrendingUp
        });
    }

    // Rule 4: Low Discipline
    if (financialDiscipline < 50) {
        alerts.push({
            title: 'Datos Incompletos',
            desc: 'La consistencia en el registro de gastos es baja. Esto reduce la confiabilidad de las proyecciones.',
            severity: 'medium',
            icon: AlertTriangle
        });
    }

    if (alerts.length === 0) return null;

    return (
        <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert, index) => (
                <div
                    key={index}
                    className={`p-4 rounded-xl border flex items-start gap-4 ${alert.severity === 'high'
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}
                >
                    <div className={`p-2 rounded-lg ${alert.severity === 'high' ? 'bg-rose-500/20' : 'bg-amber-500/20'
                        }`}>
                        <alert.icon size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">{alert.title}</h4>
                        <p className="text-xs mt-1 opacity-90 leading-relaxed">
                            {alert.desc}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
