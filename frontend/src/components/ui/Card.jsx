import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Consistent card container - dark glass theme.
 */
export default function Card({ children, className, padding = true, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-300',
        padding && 'p-5',
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }) {
  return (
    <div className={cn('border-b pb-4 mb-4', className)} style={{ borderColor: 'rgba(255,255,255,0.06)' }} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-sm font-bold text-gray-200', className)}>{children}</h3>;
}

export function CardDescription({ children, className }) {
  return <p className={cn('text-xs text-gray-500 mt-0.5', className)}>{children}</p>;
}
