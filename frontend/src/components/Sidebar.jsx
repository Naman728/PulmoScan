import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ScanLine,
  ImageIcon,
  PlayCircle,
  FileBarChart,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Brain,
  Activity,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  {
    icon: Users,
    label: 'Patient Intake',
    path: '/patient-intake',
    children: [
      { icon: UserPlus, label: 'Add Patient', path: '/patients/add' },
      { icon: ScanLine, label: 'Full Analysis Workflow', path: '/upload-scan' },
    ],
  },
  { icon: PlayCircle, label: 'AI Diagnostic Flow', path: '/upload-scan' },
  { icon: ScanLine, label: 'CT Scan', path: '/ct-analysis' },
  { icon: Brain, label: 'Brain Analysis', path: '/brain-analysis' },
  { icon: ImageIcon, label: 'X-ray Analysis', path: '/xray-analysis' },
  { icon: FileBarChart, label: 'Recent Predictions', path: '/predictions' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  const [openSection, setOpenSection] = useState('Patient Intake');

  const isActive = (path) => {
    if (path === '/upload-scan' || path === '/ai-workflow') {
      return location.pathname === '/upload-scan' ||
        location.pathname === '/processing' ||
        location.pathname === '/results' ||
        location.pathname === '/patient-intake';
    }
    return location.pathname === path;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50 overflow-hidden" style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FFFE 60%, #F0FDFA 100%)',
      borderRight: '1px solid #E2E8F0',
      boxShadow: '4px 0 32px rgba(15, 23, 42, 0.06)',
    }}>
      {/* Logo / Branding */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-800 text-slate-900 leading-tight" style={{ fontWeight: 800 }}>PulmoScan</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">AI Radiology</p>
          </div>
        </div>
      </div>

      {/* AI Status Pill */}
      <div className="mx-4 mt-4 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
        style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">AI Engine Online</p>
          <p className="text-[10px] text-slate-400">Model accuracy · 97.2%</p>
        </div>
        <Activity className="w-3.5 h-3.5 text-sky-500 ml-auto" />
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openSection === item.label;
            const hasActiveChild = item.children.some((c) => isActive(c.path));
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? '' : item.label)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    hasActiveChild
                      ? 'text-sky-700 bg-sky-50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      hasActiveChild ? 'bg-sky-100' : 'bg-slate-100'
                    )}>
                      <item.icon className={cn('w-4 h-4', hasActiveChild ? 'text-sky-600' : 'text-slate-500')} />
                    </span>
                    {item.label}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 pl-4 border-l-2 border-sky-100 space-y-0.5 pb-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive: active }) =>
                          cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                            active
                              ? 'bg-sky-50 text-sky-700 font-semibold'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          )
                        }
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
              style={({ isActive: active }) => active ? {
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(20, 184, 166, 0.08) 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(14, 165, 233, 0.2)',
              } : {}}
            >
              {({ isActive: active }) => (
                <>
                  <span className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    active ? 'bg-sky-100' : 'bg-slate-100'
                  )}>
                    <item.icon className={cn('w-4 h-4', active ? 'text-sky-600' : 'text-slate-500')} />
                  </span>
                  {item.label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Branding */}
      <div className="shrink-0 px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-100">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <div>
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Clinical AI</p>
            <p className="text-[10px] text-slate-400">For decision support only</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
