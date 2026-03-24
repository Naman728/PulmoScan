import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      className="fixed top-0 left-64 right-0 h-16 px-8 flex items-center justify-between z-40"
      style={{
        background: 'rgba(5, 5, 8, 0.6)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60"></div>
          </div>
          <span className="text-xs font-semibold text-emerald-400">AI Online</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
          <span className="font-semibold text-purple-400">{patients?.length ?? 0}</span>
          <span>patients registered</span>
        </div>
      </div>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Bell style={{ width: '18px', height: '18px' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 6px rgba(124,58,237,0.5)' }}></span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/4 transition-all border border-transparent hover:border-white/8"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-200 leading-none">{displayName}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{user?.role ?? 'Clinician'}</p>
            </div>
            <ChevronDown className={cn('w-4 h-4 text-gray-600 transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-3 w-64 py-2 rounded-[20px] z-50 overflow-hidden"
                  style={{
                    background: 'rgba(10, 10, 14, 0.95)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 58, 237, 0.08)',
                  }}
                >
                  {/* Top glow */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)' }} />

                  {/* Profile Header */}
                  <div className="px-4 py-3 border-b border-white/6 mb-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)' }}
                      >
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{displayName}</p>
                        <p className="text-xs text-gray-600 truncate max-w-[140px]">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
                      <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">{user?.role ?? 'Clinician'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
