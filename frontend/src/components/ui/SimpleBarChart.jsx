import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Redesigned SimpleBarChart matching PulmoScan dark theme.
 */
export default function SimpleBarChart({ data = [], maxValue, title, className }) {
  const values = data.map((d) => d.value);
  const max = maxValue ?? Math.max(...values, 1);

  const gradients = [
    'linear-gradient(90deg, #7C3AED, #06B6D4)',
    'linear-gradient(90deg, #06B6D4, #10B981)',
    'linear-gradient(90deg, #6366F1, #7C3AED)',
    'linear-gradient(90deg, #A78BFA, #6366F1)',
    'linear-gradient(90deg, #F59E0B, #EF4444)',
    'linear-gradient(90deg, #10B981, #059669)',
  ];

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = Math.max(2, (item.value / max) * 100);
          return (
            <div key={item.label || i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 truncate max-w-[140px]" title={item.label}>{item.label}</span>
                <span className="text-xs font-bold text-gray-300 tabular-nums ml-2">{item.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: gradients[i % gradients.length],
                    boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(124,58,237,0.3)' : 'rgba(6,182,212,0.3)'}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
