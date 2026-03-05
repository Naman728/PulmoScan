import React from 'react';
import EmptyStateLung from './EmptyStateLung';
import { Upload } from 'lucide-react';

/** Upload-to-begin state: lung illustration + upload icon + message. */
export default function EmptyStateScan({ message = 'Upload a scan to begin AI analysis', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="relative mb-6">
        <EmptyStateLung className="w-40 h-32 text-sky-400/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Upload className="w-7 h-7 text-sky-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-400 max-w-xs">{message}</p>
    </div>
  );
}
