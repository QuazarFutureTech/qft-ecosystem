// components/Header.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { getAvatarUrl } from '../services/user.js';
import UserProfileModal from './UserProfileModal.jsx';
import qftIcon from '../assets/images/QFT_Icon.png';
import './Header.css';

function Header() {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { userStatus, qftRole } = useUser();

  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : '/default-avatar.png';
  const username = userStatus?.username || 'Guest';

  return (
    <header className="user-bar">
      <div className="user-bar-left">
        <Link to="/" className="app-logo">
          <img src={qftIcon} alt="QFT" className="qft-icon" />
          🌐〢🆀🅵🆃™ • Pulse
        </Link>
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