import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const RISK_STYLES = {
  High: 'bg-red-500/20 text-red-400 border-red-500/40',
  Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

/**
 * Risk level indicator: LOW (green), MODERATE (yellow), HIGH (red).
 */
export default function RiskBadge({ level, label = 'Risk Level', className }) {
  const normalized = (level || '—').toString().toLowerCase();
  const key = normalized.includes('high') ? 'High' : normalized.includes('medium') || normalized.includes('moderate') ? 'Medium' : 'Low';
  const display = level && level !== '—'
    ? (key === 'Medium' ? 'MODERATE' : key.toUpperCase())
    : '—';

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      )}
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'inline-block px-4 py-2 rounded-lg text-sm font-bold border uppercase tracking-wider',
          RISK_STYLES[key] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40'
        )}
      >
        {display}
      </motion.span>
    </div>
  );
}
