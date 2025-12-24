import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { getAvatarUrl } from '../services/user.js';
import UserProfileModal from './UserProfileModal.jsx';
import qftIcon from '../assets/images/QFT_Icon.png';
import Breadcrumbs from './elements/Breadcrumbs'; // Import Breadcrumbs component
import './Header.css';

function Header() {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { userStatus, qftRole } = useUser();
  const { headerContent } = useHeader();

  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : '/default-avatar.png';
  const username = userStatus?.username || 'Guest';

  return (
    <header className="user-bar">
      <div className="user-bar-left">
        {headerContent ? (
          <>
            <div className="page-header-dynamic-content">
              {headerContent.kicker && <span className="header-kicker">{headerContent.kicker}</span>}
              {headerContent.title && <h1 className="header-title">{headerContent.title}</h1>}
              {headerContent.subtitle && <span className="header-subtitle">{headerContent.subtitle}</span>}
              {headerContent.breadcrumbs && <div className="header-breadcrumbs">{headerContent.breadcrumbs}</div>} {/* Render breadcrumbs */}
            </div>
            {headerContent.actions && (
              <div className="page-header-actions">
                {headerContent.actions}
              </div>
            )}
          </>
        ) : (
          <Link to="/" className="app-logo">
            <img src={qftIcon} alt="QFT" className="qft-icon" />
            🌐〢🆀🅵🆃™ • Pulse
          </Link>
        )}
      </div>
      <div className="user-bar-right">
        <div 
          className="profile-container" 
          onClick={() => setProfileModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setProfileModalOpen(true); }}
          aria-label="Open profile settings"
        >
          <img src={avatarUrl} alt={username} className="avatar-small" />
          <span className="username-label">{username}</span>
        </div>
        <UserProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
          user={userStatus}
          qftRole={qftRole}
        />
      </div>
    </header>
  );
}

export default Header;