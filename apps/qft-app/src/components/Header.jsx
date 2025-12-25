import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import { getAvatarUrl } from '../services/user.js';
import UserProfileModal from './UserProfileModal.jsx';
import qftIcon from '../assets/images/QFT_Icon.png';
import Breadcrumbs from './elements/Breadcrumbs'; // Import Breadcrumbs component
import { FaBars, FaBell, FaChevronUp, FaChevronDown } from 'react-icons/fa'; // Import FaBars icon for the toggle button
import './Header.css';

function Header({ isDashboard }) {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const { userStatus, qftRole } = useUser();
  const { headerContent } = useHeader();
  const { toggleSmartNav } = useSmartNav();

  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : '/default-avatar.png';
  const username = userStatus?.username || 'Guest';

  return (
    <header className={`user-bar ${!isExpanded ? 'is-collapsed' : ''}`}>
      <div className="user-bar-top-row">
        <div className="user-bar-left">
          {!isDashboard && (
            <button 
              className="header-sidebar-toggle"
              onClick={toggleSmartNav}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>
          )}
          <Link to="/" className="app-logo">
            <img src={qftIcon} alt="QFT" className="qft-icon" />
            QFT-Pulse
          </Link>
        </div>
        <div className="user-bar-center">
          {headerContent?.title && <h1 className="header-title">{headerContent.title}</h1>}
                    {!isDashboard && (
            <button className="header-collapse-toggle" onClick={() => setIsExpanded(!isExpanded)} aria-label="Toggle header size">
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </button>
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
                                <button className="notification-button" aria-label="View notifications">
            <FaBell />
            <span className="notification-badge">3</span>
          </button>
        </div>
      </div>
      <div className="user-bar-bottom-row">
        {headerContent?.breadcrumbs}
      </div>
      <UserProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        user={userStatus}
        qftRole={qftRole}
      />
    </header>
  );
}

export default Header;