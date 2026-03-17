import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Primary (bright blue) and secondary button styles for consistent CTAs.
 */
export function PrimaryButton({ children, className, disabled, loading, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors',
        'bg-[#2563EB] text-white hover:bg-[#1d4ed8] active:bg-[#1e40af]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
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
        'inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm border transition-colors',
        'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
