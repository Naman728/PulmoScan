import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SIZE = 130;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular AI confidence meter — updated for PulmoScan design system.
 */
export default function ConfidenceGauge({ value, label = 'AI Confidence', className }) {
  const pct = Math.min(100, Math.max(0, Number(value) ?? 0));
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#10B981';
  const textColor = pct >= 70 ? 'text-rose-600' : pct >= 40 ? 'text-amber-600' : 'text-teal-600';
  const bgColor = pct >= 70 ? 'bg-rose-50' : pct >= 40 ? 'bg-amber-50' : 'bg-teal-50';

  return (
    <div className={cn('flex items-center gap-5 p-4 rounded-2xl border border-slate-100', bgColor, className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="confidence-ring -rotate-90">
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none" stroke="#E2E8F0" strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none" stroke={color} strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={cn('text-xl font-black tabular-nums', textColor)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(pct)}%
          </motion.span>
        </div>
      </div>
      <div>
        {label && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>}
        <p className={cn('text-2xl font-black tabular-nums', textColor)}>{Math.round(pct)}%</p>
        <p className="text-xs text-slate-500 mt-1">
          {pct >= 70 ? 'High confidence prediction' : pct >= 40 ? 'Moderate confidence' : 'Low confidence'}
        </p>
      </div>
    </div>
  );
}
