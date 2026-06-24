/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Ticket } from '../types';
import { motion } from 'motion/react';

interface PriorityPieChartProps {
  filteredTickets: Ticket[];
}

interface PieSlice {
  priority: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
}

export default function PriorityPieChart({ filteredTickets }: PriorityPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const counts: Record<string, number> = {
      'Crítica': 0,
      'Alta': 0,
      'Média': 0,
      'Baixa': 0,
      'Dúvida': 0
    };

    filteredTickets.forEach(ticket => {
      if (counts[ticket.urgency] !== undefined) {
        counts[ticket.urgency]++;
      } else {
        // Fallback or unmapped
        counts['Média']++;
      }
    });

    const total = filteredTickets.length;

    const colors: Record<string, { base: string, hover: string }> = {
      'Crítica': { base: '#ef4444', hover: '#dc2626' }, // Red-500
      'Alta': { base: '#f97316', hover: '#ea580c' },    // Orange-500
      'Média': { base: '#fbbf24', hover: '#f59e0b' },   // Amber-400
      'Dúvida': { base: '#3b82f6', hover: '#2563eb' },  // Blue-500
      'Baixa': { base: '#94a3b8', hover: '#64748b' }    // Slate-400
    };

    return Object.entries(counts).map(([priority, count]) => ({
      priority,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[priority]?.base || '#cbd5e1',
      hoverColor: colors[priority]?.hover || '#94a3b8'
    })).filter(item => item.count > 0); // Only show segments with items
  }, [filteredTickets]);

  const totalCount = filteredTickets.length;

  // Let's compute SVG donut segments using strokeDasharray
  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  const slices = useMemo(() => {
    let accumulated = 0;
    return data.map((item) => {
      const percentageDecimal = item.percentage / 100;
      const strokeLength = percentageDecimal * circumference;
      const strokeOffset = circumference - (accumulated / 100) * circumference;
      accumulated += item.percentage;

      return {
        ...item,
        strokeLength,
        strokeOffset
      };
    });
  }, [data, circumference]);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs">
        Nenhum dado para exibir no gráfico de prioridades.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* Donut Chart Visualizer */}
      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          
          {/* Interactive slices */}
          {slices.map((slice, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <motion.circle
                key={slice.priority}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                strokeDashoffset={slice.strokeOffset}
                strokeLinecap="round"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="transition-all duration-200 cursor-pointer"
                animate={{
                  strokeWidth: isHovered ? strokeWidth + 2 : strokeWidth,
                }}
              />
            );
          })}
        </svg>

        {/* Core Center Label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Total
          </span>
          <span className="text-2xl font-black font-mono text-obsidian-black">
            {totalCount}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            chamados
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 w-full space-y-2.5">
        {slices.map((slice, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={slice.priority}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-all ${
                isHovered ? 'bg-slate-50' : 'bg-transparent'
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-semibold text-slate-700">
                  {slice.priority}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-right">
                <span className="text-xs font-bold text-obsidian-black font-mono">
                  {slice.count} {slice.count === 1 ? 'chamado' : 'chamados'}
                </span>
                <span className="text-xs font-extrabold text-electric-rose font-mono w-10">
                  {slice.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
