import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import SidebarNav from './SidebarNav';
import BottomNav from './BottomNav';
import TabsNav from './TabsNav';
import SmartNav from './SmartNav';
import { useUser } from '../contexts/UserContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import '../Layout.css';

function Layout() {
  const { userStatus, qftUuid } = useUser();
  const { isSmartNavOpen, closeSmartNav } = useSmartNav();
  const location = useLocation();

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    if (userStatus && qftUuid) {
      // ... (existing RPC code)
    }
  }, [location, userStatus, qftUuid]);

  return (
    <div className="app-layout">
      <Header isDashboard={isDashboard} />
      <div className="app-body">
        <TabsNav />
        {!isDashboard && <SmartNav />}
        {isSmartNavOpen && <div className="sidebar-overlay visible" onClick={closeSmartNav}></div>}
        <SidebarNav sidebarOpen={isSmartNavOpen} onCloseSidebar={closeSmartNav} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default Layout;
