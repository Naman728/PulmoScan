import React, { useState } from 'react';
import { ChevronDown, User, LogOut, Bell, Search, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../services/api';
import { cn } from '@/lib/utils';

const Header = () => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: patientService.getAll,
  });

  const initials = user?.email?.charAt(0)?.toUpperCase() ?? 'U';
  const displayName = user?.email?.split('@')[0] ?? 'User';

  return (
    <header
      className="fixed top-0 left-64 right-0 h-16 px-6 flex items-center justify-between z-40"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 2px 16px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* Left: Breadcrumb / Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60"></div>
          </div>
          <span className="text-xs font-semibold text-emerald-700">AI Online</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
          <span className="font-semibold text-sky-600">{patients?.length ?? 0}</span>
          <span>patients registered</span>
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
        >
          <Bell className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 border border-white"></span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-800 leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{user?.role ?? 'Clinician'}</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
              <div
                className="absolute right-0 top-full mt-2 w-60 py-2 rounded-2xl z-50 overflow-hidden"
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(15, 23, 42, 0.06)',
                }}
              >
                {/* Profile Header */}
                <div className="px-4 py-3 border-b border-slate-100 mb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)' }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[140px]">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 px-2 py-1 bg-sky-50 border border-sky-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider">{user?.role ?? 'Clinician'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
