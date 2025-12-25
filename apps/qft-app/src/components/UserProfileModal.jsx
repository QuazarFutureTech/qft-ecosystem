// UserProfileModal.jsx - Full user profile modal with sidebar
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { 
  FaUser, FaPalette, FaLock, FaShieldAlt, FaCreditCard, FaPlug,
  FaTimes, FaDiscord, FaFacebook, FaGoogle, FaEnvelope, FaCircle,
  FaSave, FaEdit, FaEye, FaEyeSlash, FaShoppingCart, FaBell, FaUserShield
} from 'react-icons/fa';
import './UserProfileModal.css';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useModalLock } from '../hooks/useModalLock.js';
import { isPrivilegedStaff } from '../utils/clearance.js';
import OrdersModule from './modules/OrdersModule';
import PaymentsModule from './modules/PaymentsModule';
import ReviewsModule from './modules/ReviewsModule';
import Switch from './elements/Switch';

function UserProfileModal({ isOpen, onClose, user, qftRole }) {
  const { logout } = useUser();
  const { theme, setSpecificTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('account');
  const [showPassword, setShowPassword] = useState(false);
  
  // Editable fields (in production, these would be actual user data)
  const [displayName, setDisplayName] = useState(user?.discord_username || 'User');
  const [email, setEmail] = useState(user?.email || 'user@example.com');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('online'); // online, idle, dnd, offline
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    discord: true,
    inApp: true,
    marketing: false
  });
  
  const isStaff = isPrivilegedStaff(qftRole);
  
  // Connection states
  const [connections, setConnections] = useState({
    discord: { connected: true, name: user?.discord_username || 'Discord User' },
    facebook: { connected: false, name: '' },
    google: { connected: false, name: '' },
    email: { connected: true, name: user?.email || '' }
  });

  useModalLock(isOpen);

  if (!isOpen) return null;

  const sidebarSections = [
    { id: 'account', label: 'Account', icon: FaUser },
    { id: 'appearance', label: 'Appearance', icon: FaPalette },
    { id: 'security', label: 'Security', icon: FaLock },
    { id: 'notifications', label: 'Notifications', icon: FaBell },
    { id: 'commerce', label: 'Commerce', icon: FaShoppingCart },
    { id: 'standing', label: 'Standing', icon: FaShieldAlt },
    { id: 'subscriptions', label: 'Subscriptions', icon: FaCreditCard },
    { id: 'connections', label: 'Connections', icon: FaPlug },
    ...(isStaff ? [{ id: 'staff', label: 'Staff Fields', icon: FaUserShield }] : [])
  ];

  const statusOptions = [
    { value: 'online', label: 'Online', color: '#43b581' },
    { value: 'idle', label: 'Idle', color: '#faa61a' },
    { value: 'dnd', label: 'Do Not Disturb', color: '#f04747' },
    { value: 'offline', label: 'Invisible', color: '#747f8d' },
  ];

  const handleSaveChanges = () => {
    console.log('Saving profile changes:', { displayName, email, bio, status, theme });
    alert('Profile updated successfully!');
  };

  const handleConnectService = (service) => {
    // In production, this would trigger OAuth flow
    alert(`Connecting to ${service}... (OAuth flow would start here)`);
  };

  const handleDisconnectService = (service) => {
    if (window.confirm(`Are you sure you want to disconnect ${service}?`)) {
      setConnections({
        ...connections,
        [service]: { connected: false, name: '' }
      });
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="profile-section-content">
            <h2><FaUser /> Account Settings</h2>
            
            <div className="profile-form">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  className="qft-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="qft-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Bio / About Me</label>
                <textarea
                  className="qft-textarea"
                  rows={4}
                  placeholder="Tell others about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-selector">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`status-option ${status === opt.value ? 'active' : ''}`}
                      onClick={() => setStatus(opt.value)}
                    >
                      <FaCircle style={{ color: opt.color }} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Account ID</label>
                <div className="info-display">
                  <span className="label-text">Discord ID:</span>
                  <code>{user?.discord_id || 'N/A'}</code>
                </div>
                <div className="info-display">
                  <span className="label-text">QFT UUID:</span>
                  <code>{user?.qft_uuid || 'N/A'}</code>
                </div>
              </div>

              <button className="qft-button primary" onClick={handleSaveChanges}>
                <FaSave /> Save Changes
              </button>
              <button className="qft-button logout-button" style={{ marginTop: '16px', background: '#f04747', color: 'white' }} onClick={logout}>
                <FaLock style={{ marginRight: 6 }} /> Log Out
              </button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="profile-section-content">
            <h2><FaPalette /> Appearance</h2>
            
            <div className="profile-form">
              <div className="form-group">
                <label>Theme</label>
                <div className="theme-selector">
                  {['dark', 'light', 'glass', 'cyber', 'holographic'].map(t => (
                    <button
                      key={t}
                      className={`theme-option ${theme === t ? 'active' : ''}`}
                      onClick={() => setSpecificTheme(t)}
                    >
                      <div className={`theme-preview theme-${t}`}></div>
                      <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div className="avatar-upload-section">
                  <div className="current-avatar">
                    {user?.avatar ? (
                      <img 
                        src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`}
                        alt="Profile"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        <FaUser size={48} />
                      </div>
                    )}
                  </div>
                  <div className="avatar-actions">
                    <button className="qft-button secondary">
                      <FaEdit /> Change Avatar
                    </button>
                    <p className="helper-text">Synced from Discord. Change it in Discord settings.</p>
                  </div>
                </div>
              </div>

              <button className="qft-button primary" onClick={handleSaveChanges}>
                <FaSave /> Save Appearance
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="profile-section-content">
            <h2><FaLock /> Security</h2>
            
            <div className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <div className="password-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="qft-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="qft-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="security-info">
                <h4>Two-Factor Authentication</h4>
                <p>Enable 2FA for enhanced account security.</p>
                <button className="qft-button secondary">
                  Enable 2FA
                </button>
              </div>

              <div className="security-info">
                <h4>Active Sessions</h4>
                <p>Manage devices and sessions that are logged into your account.</p>
                <button className="qft-button secondary">
                  View Sessions
                </button>
              </div>

              <button className="qft-button primary" onClick={handleSaveChanges}>
                <FaSave /> Update Security Settings
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="profile-section-content">
            <h2><FaBell /> Notification Preferences</h2>
            
            <div className="profile-form">
              <div className="form-group">
                <Switch
                  label="Email Notifications"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                />
                <p className="helper-text">Receive important updates and alerts via email</p>
              </div>

              <div className="form-group">
                <Switch
                  label="Discord Notifications"
                  checked={notifications.discord}
                  onChange={(e) => setNotifications({...notifications, discord: e.target.checked})}
                />
                <p className="helper-text">Get notified via Discord DMs</p>
              </div>

              <div className="form-group">
                <Switch
                  label="In-App Notifications"
                  checked={notifications.inApp}
                  onChange={(e) => setNotifications({...notifications, inApp: e.target.checked})}
                />
                <p className="helper-text">Show notifications within the QFT app</p>
              </div>

              <div className="form-group">
                <Switch
                  label="Marketing Communications"
                  checked={notifications.marketing}
                  onChange={(e) => setNotifications({...notifications, marketing: e.target.checked})}
                />
                <p className="helper-text">Receive updates about new features and promotions</p>
              </div>

              <button className="qft-button primary" onClick={handleSaveChanges}>
                <FaSave /> Save Preferences
              </button>
            </div>
          </div>
        );

      case 'commerce':
        return (
          <div className="profile-section-content">
            <h2><FaShoppingCart /> Commerce & Orders</h2>
            
            <div className="commerce-tabs">
              <div className="tab-section">
                <h3>📦 Orders</h3>
                <OrdersModule user={user} />
              </div>

              <div className="tab-section">
                <h3>💳 Payments</h3>
                <PaymentsModule user={user} />
              </div>

              <div className="tab-section">
                <h3>⭐ Reviews</h3>
                <ReviewsModule user={user} />
              </div>
            </div>
          </div>
        );

      case 'standing':
        return (
          <div className="profile-section-content">
            <h2><FaShieldAlt /> Account Standing</h2>
            
            <div className="standing-overview">
              <div className="standing-status good">
                <FaShieldAlt size={48} />
                <h3>Good Standing</h3>
                <p>Your account is in good standing with no active warnings or restrictions.</p>
              </div>

              <div className="standing-details">
                <h4>Account History</h4>
                <div className="history-item">
                  <span className="history-date">2025-01-15</span>
                  <span className="history-event">Account created</span>
                  <span className="history-status success">✓</span>
                </div>
                <div className="history-item">
                  <span className="history-date">2025-12-20</span>
                  <span className="history-event">Last security check</span>
                  <span className="history-status success">✓</span>
                </div>
              </div>

              <div className="standing-info">
                <h4>Community Guidelines</h4>
                <p>Review our community guidelines to ensure your account remains in good standing.</p>
                <button className="qft-button secondary">
                  View Guidelines
                </button>
              </div>
            </div>
          </div>
        );

      case 'subscriptions':
        return (
          <div className="profile-section-content">
            <h2><FaCreditCard /> Subscriptions & Billing</h2>
            
            <div className="subscription-overview">
              <div className="subscription-card">
                <h3>Free Tier</h3>
                <p className="subscription-price">$0 / month</p>
                <ul className="subscription-features">
                  <li>✓ Basic access to all features</li>
                  <li>✓ Community support</li>
                  <li>✗ Priority support</li>
                  <li>✗ Custom commands (unlimited)</li>
                </ul>
                <button className="qft-button secondary" disabled>
                  Current Plan
                </button>
              </div>

              <div className="subscription-card premium">
                <h3>Premium</h3>
                <p className="subscription-price">$9.99 / month</p>
                <ul className="subscription-features">
                  <li>✓ All Free features</li>
                  <li>✓ Priority support</li>
                  <li>✓ Custom commands (unlimited)</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Custom branding</li>
                </ul>
                <button className="qft-button primary">
                  Upgrade to Premium
                </button>
              </div>

              <div className="billing-info">
                <h4>Payment Methods</h4>
                <p>No payment methods on file.</p>
                <button className="qft-button secondary">
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        );

      case 'connections':
        return (
          <div className="profile-section-content">
            <h2><FaPlug /> Connected Accounts</h2>
            
            <div className="connections-list">
              {/* Discord Connection */}
              <div className={`connection-card ${connections.discord.connected ? 'connected' : ''}`}>
                <div className="connection-icon discord">
                  <FaDiscord size={32} />
                </div>
                <div className="connection-info">
                  <h4>Discord</h4>
                  {connections.discord.connected ? (
                    <>
                      <p className="connection-name">{connections.discord.name}</p>
                      <button 
                        className="qft-button danger small"
                        onClick={() => handleDisconnectService('discord')}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Not connected</p>
                      <button 
                        className="qft-button primary small"
                        onClick={() => handleConnectService('Discord')}
                      >
                        Connect Discord
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Facebook Connection */}
              <div className={`connection-card ${connections.facebook.connected ? 'connected' : ''}`}>
                <div className="connection-icon facebook">
                  <FaFacebook size={32} />
                </div>
                <div className="connection-info">
                  <h4>Facebook</h4>
                  {connections.facebook.connected ? (
                    <>
                      <p className="connection-name">{connections.facebook.name}</p>
                      <button 
                        className="qft-button danger small"
                        onClick={() => handleDisconnectService('facebook')}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Not connected</p>
                      <button 
                        className="qft-button primary small"
                        onClick={() => handleConnectService('Facebook')}
                      >
                        Connect Facebook
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Google Connection */}
              <div className={`connection-card ${connections.google.connected ? 'connected' : ''}`}>
                <div className="connection-icon google">
                  <FaGoogle size={32} />
                </div>
                <div className="connection-info">
                  <h4>Google</h4>
                  {connections.google.connected ? (
                    <>
                      <p className="connection-name">{connections.google.name}</p>
                      <button 
                        className="qft-button danger small"
                        onClick={() => handleDisconnectService('google')}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Not connected</p>
                      <button 
                        className="qft-button primary small"
                        onClick={() => handleConnectService('Google')}
                      >
                        Connect Google
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Email + Password */}
              <div className={`connection-card ${connections.email.connected ? 'connected' : ''}`}>
                <div className="connection-icon email">
                  <FaEnvelope size={32} />
                </div>
                <div className="connection-info">
                  <h4>Email & Password</h4>
                  {connections.email.connected ? (
                    <>
                      <p className="connection-name">{connections.email.name}</p>
                      <button 
                        className="qft-button secondary small"
                        onClick={() => setActiveSection('security')}
                      >
                        Manage
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Not configured</p>
                      <button 
                        className="qft-button primary small"
                        onClick={() => setActiveSection('security')}
                      >
                        Set Up Email
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="connections-info">
              <h4>Why connect accounts?</h4>
              <p>
                Connect your accounts to streamline login, sync data, and access integrated features across platforms.
                All connections are secured with industry-standard encryption.
              </p>
            </div>
          </div>
        );

      case 'staff':
        return (
          <div className="profile-section-content">
            <h2><FaUserShield /> Staff Management Fields</h2>
            
            <div className="profile-form staff-fields">
              <div className="form-group">
                <label>Role & Clearance Level</label>
                <div className="info-display">
                  <span className="label-text">Role:</span>
                  <code>{user?.role_name || 'N/A'}</code>
                </div>
                <div className="info-display">
                  <span className="label-text">Clearance:</span>
                  <code>{qftRole || 'N/A'}</code>
                </div>
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-list">
                  <p>✓ Access Command Center</p>
                  <p>✓ View Staff Resources</p>
                  <p>✓ Manage Tasks</p>
                  {isPrivilegedStaff(qftRole) && (
                    <>
                      <p>✓ User Management</p>
                      <p>✓ Control Panel Access</p>
                      <p>✓ System Configuration</p>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Internal Notes (Staff Only)</label>
                <textarea
                  className="qft-textarea"
                  rows={4}
                  placeholder="Internal notes visible only to privileged staff..."
                  disabled={!isPrivilegedStaff(qftRole)}
                />
                <p className="helper-text">
                  {isPrivilegedStaff(qftRole) 
                    ? 'These notes are only visible to privileged staff members' 
                    : 'View-only access to internal notes'}
                </p>
              </div>

              <div className="form-group">
                <label>Account Flags</label>
                <div className="flags-list">
                  <span className="flag-badge active">✓ Verified Staff</span>
                  <span className="flag-badge">Training Complete</span>
                  {isPrivilegedStaff(qftRole) && (
                    <span className="flag-badge privileged">★ Privileged Access</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay user-profile-modal-overlay" onClick={onClose}>
      <div className="modal-content user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <FaTimes />
        </button>

        <div className="user-profile-modal-layout">
          {/* Modal Sidebar */}
          <aside className="user-profile-sidebar">
            <div className="profile-sidebar-header">
              <div className="profile-avatar-sidebar">
                {user?.avatar ? (
                  <img 
                    src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=64`}
                    alt="Profile"
                  />
                ) : (
                  <div className="avatar-placeholder-small">
                    <FaUser />
                  </div>
                )}
                <FaCircle 
                  className="status-indicator-sidebar" 
                  style={{ color: statusOptions.find(s => s.value === status)?.color || '#747f8d' }}
                />
              </div>
              <h3>{displayName}</h3>
              <p className="user-status-text">{statusOptions.find(s => s.value === status)?.label}</p>
            </div>

            <nav className="profile-sidebar-nav">
              {sidebarSections.map(section => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.id}
                    className={`profile-nav-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <IconComponent />
                    <span>{section.label}</span>
                  </button>
                );
              })}
              <button
                className="profile-nav-item logout-button"
                style={{ marginTop: '24px', background: '#f04747', color: 'white' }}
                onClick={logout}
              >
                <FaLock style={{ marginRight: 6 }} /> Log Out
              </button>
            </nav>
          </aside>

          {/* Modal Content */}
          <main className="user-profile-content">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
