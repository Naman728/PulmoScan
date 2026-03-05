import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const SIZE = 140;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular AI confidence meter (0–100).
 */
export default function ConfidenceGauge({ value, label = 'AI Confidence', className }) {
  const pct = Math.min(100, Math.max(0, Number(value) ?? 0));
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="confidence-ring">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(51, 65, 85, 0.6)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-white tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(pct)}%
          </motion.span>
        </div>
      </div>
      {label && (
        <p className="mt-2 text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      )}
    </div>
  );
}
