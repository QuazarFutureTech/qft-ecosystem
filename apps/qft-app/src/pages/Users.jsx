// Users.jsx - Live user management and profile viewing
import React, { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaUser, FaIdCard, FaShieldAlt, FaClock, FaTimes, FaDiscord, FaEnvelope, FaBan, FaUserSlash, FaUserTimes, FaFilter, FaSortAmountDown, FaBars } from 'react-icons/fa';
import { getAllUsers } from '../services/users';
import { banUser, kickUser, timeoutUser } from '../services/moderation';
import { useUser } from '../contexts/UserContext.jsx';
import { useSelectedGuild } from '../contexts/SelectedGuildContext.jsx';
import { isPrivilegedStaff, getRoleLabel } from '../utils/clearance';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import Modal from '../components/elements/Modal.jsx';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { buildDetailBreadcrumbs } from '../utils/routeMap';
import { useModalLock } from '../hooks/useModalLock.js';

function Users() {
  const { userStatus, qftRole } = useUser();
  const { selectedGuildId } = useSelectedGuild();
  const token = localStorage.getItem('qft-token');
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('username'); // 'username' or 'id'
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeView, setActiveView] = useState('list'); // 'list' or 'profile'
  
  // New states for messaging and moderation
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationTarget, setModerationTarget] = useState(null);
  const [moderationAction, setModerationAction] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  
  
  
  const breadcrumbItems = useMemo(() => {
    if (activeView === 'profile' && selectedUser) {
      const userName = selectedUser.discord_username || selectedUser.username || 'Profile';
      return buildDetailBreadcrumbs('/users', userName);
    }
    return null; // Auto-generate from route
  }, [activeView, selectedUser]);
  
  useModalLock(showMessageModal || showModerationModal);
  
  // Filter states
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('username');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, searchType, roleFilter, sortBy]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers(token);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      if (searchType === 'username') {
        try {
          const regex = new RegExp(searchTerm, 'i');
          filtered = filtered.filter(user => 
            regex.test(user.discord_username || '') || 
            regex.test(user.username || '')
          );
        } catch (error) {
          filtered = filtered.filter(user =>
            (user.discord_username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.username || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      } else if (searchType === 'id') {
        filtered = filtered.filter(user =>
          user.discord_id.includes(searchTerm) ||
          user.qft_uuid.includes(searchTerm)
        );
      }
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'with-roles') {
        filtered = filtered.filter(u => u.roles && u.roles.length > 0);
      } else if (roleFilter === 'no-roles') {
        filtered = filtered.filter(u => !u.roles || u.roles.length === 0);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'username') {
        return (a.discord_username || a.username).localeCompare(b.discord_username || b.username);
      } else if (sortBy === 'created') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'updated') {
        return new Date(b.updated_at) - new Date(a.updated_at);
      }
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setActiveView('profile');
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedUser(null);
  };

  const handleSendMessage = (user) => {
    setMessageRecipient(user);
    setShowMessageModal(true);
  };

  const handleSubmitMessage = async () => {
    if (!messageContent.trim()) {
      alert('Message cannot be empty');
      return;
    }
    
    // TODO: Implement actual message sending via Discord DM or internal messaging
    console.log('Sending message to', messageRecipient.discord_username, ':', messageContent);
    alert(`Message sent to ${messageRecipient.discord_username} (feature coming soon)`);
    
    setShowMessageModal(false);
    setMessageContent('');
    setMessageRecipient(null);
  };

  const handleModerationAction = (user, action) => {
    setModerationTarget(user);
    setModerationAction(action);
    setShowModerationModal(true);
  };

  const handleSubmitModeration = async () => {
    if (!moderationReason.trim()) {
      alert('Reason is required for moderation actions');
      return;
    }
    
    if (!selectedGuildId) {
      alert('Please select a guild first');
      return;
    }
    
    try {
      let result;
      
      if (moderationAction === 'Ban') {
        result = await banUser(selectedGuildId, moderationTarget.discord_id, moderationReason, 0, token);
      } else if (moderationAction === 'Kick') {
        result = await kickUser(selectedGuildId, moderationTarget.discord_id, moderationReason, token);
      } else if (moderationAction === 'Timeout') {
        result = await timeoutUser(selectedGuildId, moderationTarget.discord_id, moderationReason, 60, token);
      }
      
      if (result.success) {
        alert(`Successfully ${moderationAction.toLowerCase()}ed ${moderationTarget.discord_username}`);
      } else {
        alert(`Failed to ${moderationAction.toLowerCase()} user: ${result.error}`);
      }
    } catch (error) {
      console.error('Moderation error:', error);
      alert('An error occurred while performing the moderation action');
    }
    
    setShowModerationModal(false);
    setModerationReason('');
    setModerationTarget(null);
    setModerationAction('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <Breadcrumbs items={breadcrumbItems} />
        <div>
          <h1><FaUser /> QFT Users</h1>
          <p>Search and view user profiles across the QFT Ecosystem</p>
        </div>
        
        {/* Search and Filters in Header */}
        <div className="header-actions">
          <div className="header-search-group">
            <input
              type="text"
              className="header-search-input"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>
          
          <select 
            className="header-filter-select"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            title="Search Type"
          >
            <option value="username">Username</option>
            <option value="id">User ID</option>
          </select>
          
          <select 
            className="header-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            title="Filter by Role"
          >
            <option value="all">All Users</option>
            <option value="with-roles">With Roles</option>
            <option value="no-roles">No Roles</option>
          </select>
          
          <select 
            className="header-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort By"
          >
            <option value="username">Username (A-Z)</option>
            <option value="created">Recently Created</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>
        
        {hasPrivilegedAccess && (
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-value">{users.length}</span>
              <span className="stat-label">Total Users</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{users.filter(u => u.roles && u.roles.length > 0).length}</span>
              <span className="stat-label">With Roles</span>
            </div>
          </div>
        )}
        
        {/* Mobile Sidebar Toggle */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        {/* Sidebar Browser - User List Only */}
        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {/* Users Browser */}
            <div className="browser-section full-height">
              <h3 className="browser-section-title">Users ({filteredUsers.length})</h3>
              {filteredUsers.length === 0 ? (
                <p className="browser-empty-message">No users found</p>
              ) : (
                <div className="users-browser-list">
                  {filteredUsers.map(user => (
                    <button
                      key={user.qft_uuid}
                      className={`browser-user-item ${selectedUser?.qft_uuid === user.qft_uuid ? 'active' : ''}`}
                      onClick={() => { handleViewProfile(user); closeSidebar(); }}
                    >
                      <div className="browser-user-avatar">
                        {user.avatar ? (
                          <img 
                            src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=32`} 
                            alt={user.discord_username}
                          />
                        ) : (
                          <div className="avatar-placeholder-small">
                            <FaUser />
                          </div>
                        )}
                      </div>
                      <div className="browser-user-name">
                        {user.discord_username || user.username}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="page-content">
          {activeView === 'list' ? (
            <div className="users-list-view">
              <h2>All Users</h2>
              <p className="view-description">Select a user from the sidebar to view their profile</p>
            </div>
          ) : (
            /* Profile View */
            <div className="user-profile-view">
              <div className="profile-header">
                <button className="back-button qft-button secondary" onClick={handleBackToList}>
                  <FaTimes /> Back to List
                </button>
                <h2><FaUser /> User Profile</h2>
              </div>

              {selectedUser && (
                <>
              <div className="profile-content">
              <div className="profile-top">
                <div className="profile-avatar-large">
                  {selectedUser.avatar ? (
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${selectedUser.discord_id}/${selectedUser.avatar}.png?size=256`} 
                      alt={selectedUser.discord_username}
                    />
                  ) : (
                    <div className="avatar-placeholder-large">
                      <FaDiscord size={64} />
                    </div>
                  )}
                </div>
                
                <div className="profile-identity">
                  <h1>{selectedUser.discord_username || selectedUser.username}</h1>
                  <div className="profile-ids">
                    <div className="id-item">
                      <FaDiscord /> <strong>Discord ID:</strong> {selectedUser.discord_id}
                    </div>
                    <div className="id-item">
                      <FaIdCard /> <strong>QFT UUID:</strong> {selectedUser.qft_uuid}
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h3><FaShieldAlt /> Roles & Permissions</h3>
                {selectedUser.roles && selectedUser.roles.length > 0 ? (
                  <div className="profile-roles-list">
                    {selectedUser.roles.map((role, idx) => (
                      <div key={`${role.name}-${role.clearance_level || idx}`} className="profile-role-item">
                        <span className="role-name">{role.name}</span>
                        <span className="role-clearance">
                          Clearance: {getRoleLabel(role.clearance_level)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No roles assigned (default Client access)</p>
                )}
              </div>

              <div className="profile-section">
                <h3><FaClock /> Account Information</h3>
                <div className="profile-info-grid">
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedUser.email || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">{formatDate(selectedUser.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Updated:</span>
                    <span className="info-value">{formatDate(selectedUser.updated_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Public Flags:</span>
                    <span className="info-value">{selectedUser.public_flags || 'None'}</span>
                  </div>
                </div>
              </div>

              {hasPrivilegedAccess && selectedUser.connections && (
                <div className="profile-section">
                  <h3>🔗 Connected Accounts</h3>
                  <div className="connections-list">
                    {JSON.parse(selectedUser.connections || '[]').map((conn, idx) => (
                      <div key={`${conn.type}-${conn.name || idx}`} className="connection-item">
                        <span className="connection-type">{conn.type}</span>
                        <span className="connection-name">{conn.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                  </div>

                  <div className="profile-actions">
                    <button className="qft-button secondary" onClick={handleBackToList}>
                      <FaTimes /> Back to List
                    </button>
                    {hasPrivilegedAccess && (
                      <>
                        <button 
                          className="qft-button primary"
                          onClick={() => {
                            window.location.href = `/control-panel?tab=users&user=${selectedUser.discord_id}`;
                          }}
                        >
                          <FaShieldAlt /> User Management (Control Panel)
                        </button>
                        <button 
                          className="qft-button primary"
                          onClick={() => handleSendMessage(selectedUser)}
                        >
                          <FaEnvelope /> Send Message
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Message Modal */}
      {showMessageModal && messageRecipient && (
        <div className="modal-overlay open" onClick={() => setShowMessageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaEnvelope /> Send Message</h2>
              <button className="modal-close" onClick={() => setShowMessageModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p>Sending message to: <strong>{messageRecipient.discord_username}</strong></p>
              <textarea
                className="qft-textarea"
                placeholder="Enter your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={6}
                style={{ width: '100%', marginTop: '12px' }}
              />
            </div>

            <div className="modal-footer">
              <button className="qft-button secondary" onClick={() => setShowMessageModal(false)}>
                Cancel
              </button>
              <button className="qft-button primary" onClick={handleSubmitMessage}>
                <FaEnvelope /> Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {showModerationModal && moderationTarget && (
        <div className="modal-overlay open" onClick={() => setShowModerationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaShieldAlt /> {moderationAction} User</h2>
              <button className="modal-close" onClick={() => setShowModerationModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p>You are about to <strong>{moderationAction.toLowerCase()}</strong>: <strong>{moderationTarget.discord_username}</strong></p>
              <p className="warning-text">This action will be logged and may be irreversible.</p>
              
              <label style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>
                <strong>Reason (required):</strong>
              </label>
              <textarea
                className="qft-textarea"
                placeholder="Provide a reason for this action..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                rows={4}
                style={{ width: '100%' }}
              />
            </div>

            <div className="modal-footer">
              <button className="qft-button secondary" onClick={() => setShowModerationModal(false)}>
                Cancel
              </button>
              <button className="qft-button danger" onClick={handleSubmitModeration}>
                <FaBan /> Confirm {moderationAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
