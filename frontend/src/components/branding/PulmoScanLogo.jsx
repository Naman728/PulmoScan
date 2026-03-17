import React from 'react';
import { Brain } from 'lucide-react';

export function PulmoScanLogo({ showTagline = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}
      >
        <Brain className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="font-black text-slate-900 leading-none text-base" style={{ fontWeight: 800 }}>PulmoScan</p>
        {showTagline && <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">AI Radiology</p>}
      </div>
    </div>
  );
}
