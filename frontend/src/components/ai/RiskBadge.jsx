import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const RISK_STYLES = {
  High: {
    outer: 'bg-rose-50 border-rose-200',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    label: 'text-rose-600',
  },
  Medium: {
    outer: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'text-amber-600',
  },
  Low: {
    outer: 'bg-teal-50 border-teal-200',
    badge: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    label: 'text-teal-600',
  },
};

/**
 * Risk level indicator — updated for PulmoScan design.
 */
export default function RiskBadge({ level, label = 'Risk Level', className }) {
  const normalized = (level || '—').toString().toLowerCase();
  const key = normalized.includes('high') ? 'High' : normalized.includes('medium') || normalized.includes('moderate') ? 'Medium' : 'Low';
  const display = level && level !== '—'
    ? (key === 'Medium' ? 'Moderate' : key)
    : '—';

  const styles = RISK_STYLES[key] ?? RISK_STYLES.Low;

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold', styles.outer)}
      >
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', styles.dot)} />
        <span className={styles.label}>{display} Risk</span>
      </motion.div>
    </div>
  );
}
