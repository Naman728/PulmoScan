import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Redesigned SimpleBarChart matching PulmoScan medical AI design system.
 */
export default function SimpleBarChart({ data = [], maxValue, title, className }) {
  const values = data.map((d) => d.value);
  const max = maxValue ?? Math.max(...values, 1);

  const gradients = [
    'linear-gradient(90deg, #0EA5E9, #14B8A6)',
    'linear-gradient(90deg, #14B8A6, #10B981)',
    'linear-gradient(90deg, #6366F1, #0EA5E9)',
    'linear-gradient(90deg, #8B5CF6, #6366F1)',
    'linear-gradient(90deg, #F59E0B, #EF4444)',
    'linear-gradient(90deg, #10B981, #059669)',
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = Math.max(2, (item.value / max) * 100);
          return (
            <div key={item.label || i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 truncate max-w-[140px]" title={item.label}>{item.label}</span>
                <span className="text-xs font-bold text-slate-700 tabular-nums ml-2">{item.value}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: gradients[i % gradients.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
