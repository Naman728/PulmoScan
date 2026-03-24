import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Primary and secondary button styles - dark theme with purple/cyan gradient.
 */
export function PrimaryButton({ children, className, disabled, loading, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all',
        'text-white hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        className
      )}
      style={{
        background: (disabled || loading) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #7C3AED, #06B6D4)',
        boxShadow: (disabled || loading) ? 'none' : '0 4px 16px rgba(124, 58, 237, 0.3)',
      }}
      {...rest}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          {children || 'Processing...'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function SecondaryButton({ children, className, disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm border transition-all',
        'text-gray-400 hover:text-purple-300 hover:border-purple-500/30 hover:scale-[1.02]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        className
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
