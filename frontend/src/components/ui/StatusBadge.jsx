import React from 'react';
import { cn } from '@/lib/utils';

const VARIANT_STYLES = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  danger: 'bg-red-500/20 text-red-400 border-red-500/40',
  info: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  neutral: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

/**
 * Generic status badge. variant: success (green), warning (yellow), danger (red), info (blue), neutral.
 */
export default function StatusBadge({ children, variant = 'neutral', className, size = 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-lg',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-4 py-2 text-base',
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
