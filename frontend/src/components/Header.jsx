import React, { useState } from 'react';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../services/api';
import { cn } from '../utils/cn';
import { PulmoScanLogo } from './branding';

const Header = () => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
  });

  return (
    <header className="fixed top-0 left-56 right-0 h-16 px-6 flex items-center justify-between z-40 glass-card border-b border-slate-700/50">
      <div className="flex items-center gap-6">
        <PulmoScanLogo className="hidden sm:flex" />
        <p className="text-sm text-slate-400">
        <span className="font-semibold text-sky-300">{patients?.length ?? 0}</span> patients
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-sky-500/30 border border-sky-500/40 flex items-center justify-center text-sky-200 text-sm font-medium">
            {user?.email?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm font-medium text-slate-300 hidden sm:block">
            {user?.email?.split('@')[0] ?? 'User'}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-slate-500', profileOpen && 'rotate-180')} />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
            <div className="absolute right-0 top-full mt-1 w-56 py-2 glass-card border border-slate-700/50 rounded-xl shadow-xl z-50">
              <div className="px-4 py-2 border-b border-slate-700/50">
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.role ?? 'Clinician'}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 text-left rounded-lg"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
