import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import SidebarNav from './SidebarNav';
import BottomNav from './BottomNav';
// import BreadcrumbNav from './BreadcrumbNav'; // Remove this import
import { HeaderProvider } from '../contexts/HeaderContext.jsx';
import { useUser } from '../contexts/UserContext.jsx'; // Import useUser
import '../Layout.css';

function Layout() {
  const { userStatus, qftUuid } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (userStatus && qftUuid) {
      // ... (existing RPC code)
    }
  }, [location, userStatus, qftUuid]);

  return (
    <HeaderProvider>
      <div className="app-layout">
        <Header />
        {/* <BreadcrumbNav /> Removed */}
        <div className="app-body">
          <SidebarNav /> {/* Always render, CSS will control visibility */}
          <main className="app-main">
            <Outlet />
          </main>
        </div>
        <BottomNav /> {/* Always render, CSS will control visibility */}
      </div>
    </HeaderProvider>
  );
}

export default Layout;
