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
    <div className="flex min-h-screen relative overflow-hidden" style={{ background: '#050508' }}>
      <Sidebar />
      <div className="flex-1 ml-64 min-w-0 relative z-10 w-full max-w-full">
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
