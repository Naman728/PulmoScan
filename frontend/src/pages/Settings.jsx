import React from 'react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Application settings.</p>
      </div>
      <div className="glass-card border border-slate-700/50 rounded-xl p-6">
        <p className="text-sm text-slate-400">No settings available yet.</p>
      </div>
    </div>
  );
}
