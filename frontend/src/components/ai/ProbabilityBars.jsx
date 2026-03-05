import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * items: [ { label, value (0-100), color? } ]
 */
export default function ProbabilityBars({ items, title = 'Probability Distribution', className }) {
  const max = Math.max(...(items.map((i) => i.value) || [1]), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-3">
        {(items || []).map((item, i) => (
          <div key={item.label || i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 font-medium">{item.label}</span>
              <span className="text-slate-400 tabular-nums">{Math.round(item.value)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', item.color || 'bg-sky-500')}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
