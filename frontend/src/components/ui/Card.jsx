import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Consistent card container - updated to match PulmoScan design system.
 */
export default function Card({ children, className, padding = true, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white shadow-sm',
        padding && 'p-5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }) {
  return (
    <div className={cn('border-b border-slate-100 pb-4 mb-4', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-sm font-bold text-slate-900', className)}>{children}</h3>;
}

export function CardDescription({ children, className }) {
  return <p className={cn('text-xs text-slate-500 mt-0.5', className)}>{children}</p>;
}
