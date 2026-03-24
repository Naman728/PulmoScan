import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
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
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => {
    if (path === '/upload-scan' || path === '/ai-workflow') {
      return location.pathname === '/upload-scan' ||
        location.pathname === '/processing' ||
        location.pathname === '/results' ||
        location.pathname === '/patient-intake';
    }
    return location.pathname === path;
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden transition-all duration-300',
      sidebarWidth
    )} style={{
      background: '#050508',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '1px 0 0 rgba(255,255,255,0.02), 4px 0 30px rgba(0, 0, 0, 0.6)',
    }}>
      {/* Logo / Branding */}
      <div className="shrink-0 px-4 py-5 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.35)',
            }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="text-base text-white leading-tight" style={{ fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>PulmoScan</h1>
              <p className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-widest">AI Radiology</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Status Pill */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 mt-4 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid rgba(124, 58, 237, 0.12)',
          }}
        >
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60"></div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">AI Engine Online</p>
            <p className="text-[10px] text-gray-600">Model accuracy · 97.2%</p>
          </div>
          <Activity className="w-3.5 h-3.5 text-purple-400 ml-auto" />
        </motion.div>
      )}

      {/* Collapse button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-5 -right-3 w-6 h-6 rounded-full flex items-center justify-center z-50 transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronLeft className="w-3 h-3 text-white" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
        {!collapsed && <p className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Navigation</p>}
        {navItems.map((item) => {
          if (item.children && !collapsed) {
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
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                  style={hasActiveChild ? { background: 'rgba(255, 255, 255, 0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' } : {}}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                      hasActiveChild ? 'bg-purple-500/15' : 'bg-white/4'
                    )}>
                      <item.icon className={cn('w-4 h-4', hasActiveChild ? 'text-purple-400' : 'text-gray-600')} />
                    </span>
                    {item.label}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 mt-1 pl-4 border-l-2 border-purple-500/20 space-y-0.5 pb-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive: active }) =>
                              cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                                active
                                  ? 'text-purple-300 font-semibold'
                                  : 'text-gray-600 hover:text-gray-400'
                              )
                            }
                            style={({ isActive: active }) => active ? { background: 'rgba(124, 58, 237, 0.08)' } : {}}
                          >
                            <child.icon className="w-3.5 h-3.5 shrink-0" />
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // For collapsed items with children, just show the parent icon
          if (item.children && collapsed) {
            const hasActiveChild = item.children.some((c) => isActive(c.path));
            return (
              <NavLink
                key={item.label}
                to={item.children[0].path}
                className="flex items-center justify-center py-2.5 rounded-xl transition-all duration-200"
                style={hasActiveChild ? {
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(6, 182, 212, 0.08))',
                  boxShadow: 'inset 0 0 0 1px rgba(124, 58, 237, 0.2)',
                } : {}}
                title={item.label}
              >
                <span className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                  hasActiveChild ? 'bg-purple-500/15' : 'bg-white/4 hover:bg-white/8'
                )}>
                  <item.icon className={cn('w-4.5 h-4.5', hasActiveChild ? 'text-purple-400' : 'text-gray-600 hover:text-gray-400')} style={{ width: 18, height: 18 }} />
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'text-white font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )
              }
              style={({ isActive: active }) => active ? {
                background: 'linear-gradient(90deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 1px 0 0 rgba(124, 58, 237, 0.4)',
              } : {}}
              title={collapsed ? item.label : undefined}
            >
              {({ isActive: active }) => (
                <>
                  <span className={cn(
                    'rounded-lg flex items-center justify-center transition-all',
                    collapsed ? 'w-9 h-9' : 'w-8 h-8',
                    active ? 'bg-purple-500/15' : 'bg-white/4'
                  )}>
                    <item.icon className={cn('w-4 h-4', active ? 'text-purple-400' : 'text-gray-600')} />
                  </span>
                  {!collapsed && item.label}
                  {!collapsed && active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 8px rgba(124, 58, 237, 0.5)' }}></span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Branding */}
      <div className="shrink-0 px-3 py-4 border-t border-white/6">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06), rgba(124, 58, 237, 0.06))',
            border: '1px solid rgba(6, 182, 212, 0.1)',
          }}>
            <Stethoscope className="w-4 h-4 text-cyan-500" />
            <div>
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Clinical AI</p>
              <p className="text-[10px] text-gray-600">For decision support only</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Stethoscope className="w-4 h-4 text-cyan-500" />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
