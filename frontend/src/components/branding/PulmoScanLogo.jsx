import React from 'react';
import PulmoScanIcon from './PulmoScanIcon';

/** Full logo for header: icon + wordmark. */
export default function PulmoScanLogo({ showTagline = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <PulmoScanIcon className="w-9 h-9 shrink-0" />
      <div>
        <span className="text-lg font-bold text-white tracking-tight">PULMOSCAN</span>
        {showTagline && (
          <p className="text-xs text-slate-400 mt-0.5">AI Diagnostic Platform</p>
        )}
      </div>
    </div>
  );
}
