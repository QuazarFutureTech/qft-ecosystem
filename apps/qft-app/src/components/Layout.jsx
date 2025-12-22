import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useUser } from '../contexts/UserContext.jsx';
import { sendRpcActivity } from '../services/discord.js';

function Layout() {
  const { userStatus, qftUuid } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (userStatus && qftUuid) {
      let details = 'In QFT App';
      let state = 'Browsing';

      switch (location.pathname) {
        case '/chat':
        case '/feed': // Legacy route
          state = 'Viewing Chat';
          break;
        case '/profile':
          state = 'On Profile Page';
          details = userStatus.username ? `Viewing ${userStatus.username}'s Profile` : 'Viewing Profile';
          break;
        case '/contacts':
          state = 'Checking Contacts';
          break;
        case '/management':
          state = 'Managing Resources';
          break;
        case '/admin':
          state = 'Admin Dashboard';
          details = 'Managing the System';
          break;
        default:
          state = 'Idle';
          break;
      }

      sendRpcActivity({
        details: details,
        state: state,
        assets: {
          large_image: 'qft_logo',
          large_text: 'QFT Ecosystem'
        }
      }, localStorage.getItem('qft-token')).catch(console.error);
    }
  }, [location, userStatus, qftUuid]);

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

export default Layout;
