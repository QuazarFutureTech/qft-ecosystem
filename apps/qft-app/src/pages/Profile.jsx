import React, { useState, useEffect } from 'react';
import { getAvatarUrl, parseBadges } from '../services/user'; // Import helper functions
import './Profile.css'; // Assuming you'll create this for styling
import { useUser } from '../contexts/UserContext.jsx'; // Import useUser
import { useTheme } from '../contexts/ThemeContext.jsx'; // Import useTheme

function Profile() {
  const { userStatus, isLoadingUser, userGuilds, userConnections, logout } = useUser(); // Get userConnections from context
  const { theme, toggleTheme } = useTheme(); // Get theme and toggleTheme from context
  const handleLogout = () => {
    logout(); // Call the logout function from UserContext
    // Optionally redirect to login page or home
    window.location.href = '/login'; // Or use react-router-dom's history.push
  };

  if (isLoadingUser) {
    return <div className="page-content">Loading profile...</div>;
  }

  // userStatus will be null if not logged in or an error occurred during fetch in AppContent
  if (!userStatus) {
    return (
      <div className="page-content">
        <p>No user data found or not logged in.</p>
        {/* Placeholder for a login redirection message or button */}
        <button onClick={() => window.location.href = '/login'} className="qft-button">Go to Login</button>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(userStatus);
  const badges = parseBadges(userStatus.public_flags);

  return (
    <div className="page-content profile-page">
      <h1>Your Profile</h1>

              {/* User Discord Profile Section */}
            <div className="profile-card qft-card">
              <h2>Discord Profile</h2>
              {avatarUrl && (
                <img src={avatarUrl} alt={`${userStatus.global_name || userStatus.username}'s avatar`} className="profile-avatar" />
              )}
              <h3>{userStatus.global_name || userStatus.username}</h3>
              <p className="profile-username">@{userStatus.username}</p>
              <p>User ID: {userStatus.id}</p>
      
              {/* User Badges */}
              {badges.length > 0 && (
                <div className="profile-badges">
                  <h4>Badges:</h4>
                  <div className="badges-list">
                    {badges.map((badge, index) => (
                      <span key={index} className="badge-item">{badge}</span>
                    ))}
                  </div>
                </div>
              )}
      
              {/* Discord Roles Placeholder */}
              <div className="profile-roles" style={{ marginTop: '20px' }}>
                <h4>Roles:</h4>
                {/*
                  Future Integration:
                  This section will display roles the user has in various Discord guilds
                  where the QFT bot is present. This would require fetching guild-specific
                  member data (which includes roles).
      
                  Example Structure:
                  <ul>
                    {userRoles.map(role => (
                      <li key={role.id} className="role-item" style={{ color: role.color }}>
                        {role.name}
                      </li>
                    ))}
                  </ul>
                */}
                <p className="placeholder-text" style={{ fontStyle: 'italic', color: 'var(--text-color-secondary)' }}>
                  Discord roles will appear here upon full integration with guild data.
                </p>
              </div>
      
              {/* Logout Button */}
              <button onClick={handleLogout} className="qft-button logout-button">
                Logout
              </button>
            </div>
      
            {/* User Connections Section */}
            {userConnections && userConnections.length > 0 && (
                <div className="profile-card qft-card" style={{ marginTop: '20px' }}>
                    <h2>Connected Accounts</h2>
                    <div className="connections-list">
                        {userConnections.map((connection, index) => (
                            <div key={index} className="connection-item">
                                <strong>{connection.type.charAt(0).toUpperCase() + connection.type.slice(1)}:</strong> {connection.name} ({connection.visibility === 1 ? 'Visible' : 'Hidden'})
                                {connection.verified && <span className="verified-badge"> Verified</span>}
                                {connection.revoked && <span className="revoked-badge"> Revoked</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
      
            {/* Theme Toggle Section */}
            <div className="profile-card qft-card" style={{ marginTop: '20px' }}>
              <h2>App Settings</h2>
              <div className="theme-toggle-container">
                <span>Current Theme: <strong>{theme.charAt(0).toUpperCase() + theme.slice(1)}</strong></span>
                <button onClick={toggleTheme} className="qft-button toggle-theme-button">
                  Toggle Theme
                </button>
              </div>
              {/* Placeholder for other user settings */}
              {/*
                Future Integration:
                Add more user-specific settings here such as notification preferences,
                language settings, privacy controls, etc. These would typically be
                managed via API calls to a user settings service.
              */}
              <div className="other-settings" style={{ marginTop: '15px' }}>
                <h4>General Preferences:</h4>
                <p className="placeholder-text" style={{ fontStyle: 'italic', color: 'var(--text-color-secondary)' }}>
                  Notification settings, language preferences, and other personalizations will be configurable here.
                </p>
                <button className="qft-button" style={{ marginTop: '10px' }}>Edit Preferences</button>
              </div>
            </div>
      
          </div>  );
}

export default Profile;
