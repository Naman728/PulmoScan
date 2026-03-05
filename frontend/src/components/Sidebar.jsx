import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  ScanLine,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { PulmoScanLogo } from './branding';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Patients', path: '/patients' },
  { icon: UploadCloud, label: 'Upload Scan', path: '/upload' },
  { icon: ScanLine, label: 'AI Predictions', path: '/predictions' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col glass-card border-r border-slate-700/50 z-50 overflow-hidden">
      <div className="shrink-0 p-6 border-b border-slate-700/50">
        <PulmoScanLogo showTagline />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 glow-soft-blue'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
