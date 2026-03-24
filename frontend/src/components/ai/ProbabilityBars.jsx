import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Probability bars — dark theme with glowing gradients.
 * items: [ { label, value (0-100), color? } ]
 */
export default function ProbabilityBars({ items, title = 'Probability Distribution', className }) {
  const max = Math.max(...(items.map((i) => i.value) || [1]), 1);

  const getGradient = (value) => {
    if (value >= 60) return 'linear-gradient(90deg, #F87171, #EF4444)';
    if (value >= 30) return 'linear-gradient(90deg, #FBBF24, #F59E0B)';
    return 'linear-gradient(90deg, #34D399, #06B6D4)';
  };

  const getColor = (value) => {
    if (value >= 60) return 'text-rose-400';
    if (value >= 30) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getGlow = (value) => {
    if (value >= 60) return '0 0 12px rgba(248,113,113,0.3)';
    if (value >= 30) return '0 0 12px rgba(251,191,36,0.3)';
    return '0 0 12px rgba(52,211,153,0.3)';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-3">
        {(items || []).map((item, i) => (
          <div key={item.label || i} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-medium">{item.label}</span>
              <span className={cn('font-bold tabular-nums', getColor(item.value))}>{Math.round(item.value)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                style={{ background: getGradient(item.value), boxShadow: getGlow(item.value) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
