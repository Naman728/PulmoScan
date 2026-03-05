import React from 'react';
import { Users } from 'lucide-react';

/** Illustration for no patients: users icon with medical styling. */
export default function EmptyStatePatients({ className = 'w-24 h-24' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
        <Users className="w-12 h-12 text-sky-400/80" strokeWidth={1.5} />
      </div>
    </div>
  );
}
