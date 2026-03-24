import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const RISK_STYLES = {
  High: {
    outer: 'bg-rose-500/8 border-rose-500/20',
    dot: 'bg-rose-500',
    label: 'text-rose-400',
    glow: '0 0 12px rgba(248,113,113,0.15)',
  },
  Medium: {
    outer: 'bg-amber-500/8 border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'text-amber-400',
    glow: '0 0 12px rgba(251,191,36,0.15)',
  },
  Low: {
    outer: 'bg-emerald-500/8 border-emerald-500/20',
    dot: 'bg-emerald-500',
    label: 'text-emerald-400',
    glow: '0 0 12px rgba(52,211,153,0.15)',
  },
};

/**
 * Risk level indicator — dark theme.
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
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{label}</p>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold', styles.outer)}
        style={{ boxShadow: styles.glow }}
      >
        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', styles.dot)} />
        <span className={styles.label}>{display} Risk</span>
      </motion.div>
    </div>
  );
}
