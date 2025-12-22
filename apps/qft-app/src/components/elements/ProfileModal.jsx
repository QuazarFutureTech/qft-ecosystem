import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useUser } from '../../contexts/UserContext.jsx';
import { getAvatarUrl } from '../../services/user.js';
import { FaTimes, FaPalette, FaBell, FaDiscord, FaSignOutAlt, FaUser } from 'react-icons/fa';
import './ProfileModal.css';
import { useModalLock } from '../../hooks/useModalLock.js';

const THEMES = ['cyber', 'holographic', 'glass', 'dark', 'light'];

export default function ProfileModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { theme, setSpecificTheme } = useTheme();
  const { userStatus, logout } = useUser();
  
  const [notifications, setNotifications] = useState({ 
    email: false, 
    discord: true, 
    inapp: true 
  });
  
  const modalRef = useRef(null);
  const avatarUrl = userStatus ? getAvatarUrl(userStatus) : '/default-avatar.png';

  // Load persisted notification preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem('qft-notifications');
      if (raw) setNotifications(JSON.parse(raw));
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  }, []);

  // Persist notification preferences
  useEffect(() => {
    try {
      localStorage.setItem('qft-notifications', JSON.stringify(notifications));
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
    }
  }, [notifications]);

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      const firstFocusable = modalRef.current?.querySelector('button, select, input, textarea');
      firstFocusable?.focus();
    }
  }, [isOpen]);

  useModalLock(isOpen);

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const handleOverlayClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="profile-modal-overlay" 
      ref={modalRef}
      onClick={handleOverlayClick}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="profile-modal-title"
    >
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2 id="profile-modal-title"><FaUser /> Profile & Settings</h2>
          <button 
            className="profile-modal-close" 
            onClick={onClose}
            aria-label="Close profile modal"
          >
            <FaTimes />
          </button>
        </div>

        <div className="profile-modal-content">
          {/* Discord Profile Section */}
          <section className="profile-section">
            <h3><FaDiscord /> Discord Profile</h3>
            <div className="discord-profile-card">
              <img 
                src={avatarUrl} 
                alt={`${userStatus?.username || 'User'}'s avatar`}
                className="profile-avatar"
              />
              <div className="profile-info">
                <div className="profile-username">{userStatus?.username || 'Guest User'}</div>
                <div className="profile-discriminator">#{userStatus?.discriminator || '0000'}</div>
                {userStatus?.email && (
                  <div className="profile-email">{userStatus.email}</div>
                )}
              </div>
            </div>

            {/* Connections/Badges */}
            {userStatus?.connections && userStatus.connections.length > 0 && (
              <div className="profile-connections">
                <h4>Connected Accounts</h4>
                <div className="connections-list">
                  {userStatus.connections.map((conn, idx) => (
                    <div key={idx} className="connection-badge">
                      {conn.type}: {conn.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Theme Section */}
          <section className="profile-section">
            <h3><FaPalette /> Theme</h3>
            <div className="theme-selector">
              {THEMES.map((t) => (
                <button
                  key={t}
                  className={`theme-option ${theme === t ? 'active' : ''}`}
                  onClick={() => setSpecificTheme(t)}
                  aria-label={`Switch to ${t} theme`}
                  aria-pressed={theme === t}
                >
                  <span className="theme-preview" data-theme={t}></span>
                  <span className="theme-label">{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Notifications Section */}
          <section className="profile-section">
            <h3><FaBell /> Notifications</h3>
            <div className="notification-settings">
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications(n => ({ ...n, email: e.target.checked }))}
                  aria-label="Email notifications"
                />
                <span>Email Notifications</span>
              </label>
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={notifications.discord}
                  onChange={(e) => setNotifications(n => ({ ...n, discord: e.target.checked }))}
                  aria-label="Discord notifications"
                />
                <span>Discord Notifications</span>
              </label>
              <label className="notification-toggle">
                <input
                  type="checkbox"
                  checked={notifications.inapp}
                  onChange={(e) => setNotifications(n => ({ ...n, inapp: e.target.checked }))}
                  aria-label="In-app alerts"
                />
                <span>In-App Alerts</span>
              </label>
            </div>
          </section>
        </div>

        <div className="profile-modal-footer">
          <button 
            className="qft-button danger" 
            onClick={handleLogout}
            aria-label="Log out of QFT Ecosystem"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
