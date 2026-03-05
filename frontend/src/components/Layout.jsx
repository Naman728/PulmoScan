import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BackgroundPatterns from './patterns/BackgroundPatterns';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[var(--bg-deep)] text-slate-100 relative">
      <BackgroundPatterns />
      <Sidebar />
      <div className="flex-1 ml-56 min-w-0 relative z-10">
        <Header />
        <main className="pt-16 px-6 py-8 md:px-8 md:py-10 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.8); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.6); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.7); }
      `}</style>
    </div>
  );
};

export default Layout;
