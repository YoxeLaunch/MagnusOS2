import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { calculateFlowData, SankeyNode, SankeyLink } from '../utils/flowAnalysis';
import { Network, TrendingUp, Wallet, ArrowRight } from 'lucide-react';

export const FinancialSankey: React.FC = () => {
    const { dailyTransactions } = useData();
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);

    const data = useMemo(() => calculateFlowData(dailyTransactions), [dailyTransactions]);

    if (!data) return null;

    const { nodes, links, totalIncome } = data;

    // Canvas dimensions
    const width = 800;
    const height = Math.max(400, links.length * 60);
    const padding = 40;
    const columnWidth = 150;
    const nodeWidth = 10;

    // Calculate vertical positions
    // Left Column: Income (Centered basically, or top aligned?)
    // Let's center the Source node vertically
    const sourceNodeY = (height - (data.totalIncome / totalIncome) * (height - 100)) / 2;
    // Actually we map Value -> Pixels
    // Scale: Max pixels available / Total Income
    // Ensure we leave some padding
    const scale = (height - 100) / (Math.max(data.totalIncome, data.totalExpense) || 1);

    const sourceHeight = data.totalIncome * scale;
    const sourceY = (height - sourceHeight) / 2;

    // Right Column: Expenses & Savings
    // Stack them vertically with gap
    let currentY = 20; // Start offset
    const targetNodesWithPos = nodes
        .filter(n => n.type !== 'source')
        .map(n => {
            const h = n.value * scale;
            const y = currentY;
            currentY += h + 20; // 20px gap
            return { ...n, x: width - padding - columnWidth, y, height: h };
        });

    const sourceNode = {
        name: 'Ingresos',
        value: data.totalIncome,
        x: padding,
        y: sourceY,
        height: sourceHeight,
        color: '#10B981'
    };

    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:border-emerald-500/30">
            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Network className="text-emerald-500" />
                    Análisis de Flujo Financiero
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                    Visualización del destino real de tu dinero basado en los últimos ciclos cerrados.
                </p>
            </div>

            <div className="w-full overflow-x-auto">
                <div style={{ minWidth: '700px' }} className="relative select-none">
                    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                        <defs>
                            <linearGradient id="flowGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.8} />
                            </linearGradient>
                            <linearGradient id="saveGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
                            </linearGradient>
                        </defs>

                        {/* Links (Paths) */}
                        {targetNodesWithPos.map((target, i) => {
                            // Calculate Path
                            // Start: Right side of Source
                            const startX = sourceNode.x + nodeWidth;
                            // We need to distribute the outcome of source. 
                            // This is tricky without strict ordering. 
                            // Simplified: We assume Source is big enough block. 
                            // We draw from "center" of source to "center" of target? 
                            // Better: Stack links on source side too.

                            // Calculate specific Y start for this link based on accumulated previous links
                            const previousValues = targetNodesWithPos.slice(0, i).reduce((sum, n) => sum + n.value, 0);
                            const startLinkY = sourceNode.y + (previousValues * scale);
                            const linkHeight = target.value * scale;

                            const endX = target.x;
                            const endY = target.y;

                            // Bezier Curve
                            // M startX, startY + h/2
                            // C cp1x, cp1y, cp2x, cp2y, endX, endY + h/2
                            // Make it a thick path or a filled shape? 
                            // Calculating a filled "ribbon" is harder (need 4 points).
                            // Let's do thick Stroke for simplicity first, or refined path.

                            const cp1x = startX + (width / 2);
                            const cp1y = startLinkY + (linkHeight / 2);
                            const cp2x = endX - (width / 2); // Tension
                            const cp2y = endY + (target.height / 2);

                            const path = `
                                M ${startX} ${startLinkY + linkHeight / 2}
                                C ${startX + 200} ${startLinkY + linkHeight / 2}, ${endX - 200} ${endY + target.height / 2}, ${endX} ${endY + target.height / 2}
                            `;

                            const isSavings = target.type === 'surplus';
                            const isHovered = hoveredLink === target.name;

                            return (
                                <g key={target.name}>
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke={isSavings ? "url(#saveGradient)" : "url(#flowGradient)"}
                                        strokeWidth={Math.max(2, linkHeight)}
                                        strokeOpacity={isHovered ? 0.9 : 0.4}
                                        className="transition-all duration-300 ease-out cursor-pointer"
                                        onMouseEnter={() => setHoveredLink(target.name)}
                                        onMouseLeave={() => setHoveredLink(null)}
                                    />
                                    {/* Label on path (optional) */}
                                </g>
                            );
                        })}

                        {/* Source Node */}
                        <g>
                            <rect
                                x={sourceNode.x}
                                y={sourceNode.y}
                                width={nodeWidth}
                                height={sourceNode.height}
                                rx={4}
                                fill={sourceNode.color}
                                className="shadow-lg"
                            />
                            <text
                                x={sourceNode.x + 20}
                                y={sourceNode.y + sourceNode.height / 2}
                                fill="currentColor"
                                className="text-sm font-bold text-slate-700 dark:text-slate-200"
                                dy={-10}
                            >
                                Ingresos
                            </text>
                            <text
                                x={sourceNode.x + 20}
                                y={sourceNode.y + sourceNode.height / 2}
                                fill="currentColor"
                                className="text-xs font-mono text-emerald-500"
                                dy={10}
                            >
                                ${sourceNode.value}
                            </text>
                        </g>

                        {/* Target Nodes */}
                        {targetNodesWithPos.map(node => (
                            <g key={node.name}>
                                <rect
                                    x={node.x}
                                    y={node.y}
                                    width={nodeWidth}
                                    height={Math.max(node.height, 4)}
                                    rx={4}
                                    fill={node.color || '#EF4444'}
                                />
                                <text
                                    x={node.x - 10}
                                    y={node.y + node.height / 2}
                                    textAnchor="end"
                                    fill="currentColor"
                                    className="text-xs font-medium text-slate-600 dark:text-slate-300"
                                    dy={-5}
                                >
                                    {node.name}
                                </text>
                                <text
                                    x={node.x - 10}
                                    y={node.y + node.height / 2}
                                    textAnchor="end"
                                    fill={node.color}
                                    className="text-xs font-bold font-mono"
                                    dy={10}
                                >
                                    ${node.value}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

        </div>
    );
};
