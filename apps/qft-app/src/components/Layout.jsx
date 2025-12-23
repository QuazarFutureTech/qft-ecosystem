import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import SidebarNav from './SidebarNav';
import BottomNav from './BottomNav';
import BreadcrumbNav from './BreadcrumbNav';
import { HeaderProvider } from '../contexts/HeaderContext.jsx';
import { useUser } from '../contexts/UserContext.jsx'; // Import useUser
import '../Layout.css';

function Layout() {
  const { userStatus, qftUuid } = useUser();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleResize = () => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userStatus && qftUuid) {
      // ... (existing RPC code)
    }
  }, [location, userStatus, qftUuid]);

  return (
    <HeaderProvider>
      <div className="app-layout">
        <Header />
        <BreadcrumbNav />
        <div className="app-body">
          {isMobile ? null : <SidebarNav />}
          <main className="app-main">
            <Outlet />
          </main>
        </div>
        {isMobile && <BottomNav />}
      </div>
    </HeaderProvider>
  );
}

export default Layout;
