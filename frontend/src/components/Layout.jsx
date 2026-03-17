import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * App layout: Sidebar + Topbar (Header) + MainContent (Outlet for nested routes).
 * All authenticated routes render inside this layout so sidebar navigation is always visible.
 */
const Layout = () => {
  return (
    <div className="flex min-h-screen relative" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 30%, #ECFDF5 70%, #F0FDF4 100%)' }}>
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 relative">
        <Header />
        <main className="pt-16">
          <div className="px-6 py-8 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
