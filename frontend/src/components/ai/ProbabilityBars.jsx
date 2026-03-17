import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Probability bars — updated for PulmoScan light design system.
 * items: [ { label, value (0-100), color? } ]
 */
export default function ProbabilityBars({ items, title = 'Probability Distribution', className }) {
  const max = Math.max(...(items.map((i) => i.value) || [1]), 1);

  const getGradient = (value) => {
    if (value >= 60) return 'linear-gradient(90deg, #F87171, #EF4444)';
    if (value >= 30) return 'linear-gradient(90deg, #FCD34D, #F59E0B)';
    return 'linear-gradient(90deg, #34D399, #14B8A6)';
  };

  const getColor = (value) => {
    if (value >= 60) return 'text-rose-600';
    if (value >= 30) return 'text-amber-600';
    return 'text-teal-600';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-3">
        {(items || []).map((item, i) => (
          <div key={item.label || i} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 font-medium">{item.label}</span>
              <span className={cn('font-bold tabular-nums', getColor(item.value))}>{Math.round(item.value)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                style={{ background: getGradient(item.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
