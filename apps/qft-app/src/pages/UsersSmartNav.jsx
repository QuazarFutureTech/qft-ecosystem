import React from 'react';

function UsersSmartNav({
  activeUser,
  activeUserId,
  handleUserSelect,
  searchTerm,
  setSearchTerm,
  withRoles,
  withoutRoles,
  onClose,
}) {
  const onUserClick = (userId) => {
    handleUserSelect(userId);
    onClose();
  };

  if (activeUser) {
    return (
      <nav className="sidebar-nav">
        <button
          className="sidebar-nav-item"
          style={{ marginBottom: 16 }}
          onClick={() => onUserClick(null)}
        >
          <span className="nav-icon">&larr;</span>
          <span className="nav-label">Back to User List</span>
        </button>
        <div className="sidebar-section" style={{ marginTop: 24 }}>
          <div className="sidebar-section-title">Actions</div>
          <button className="sidebar-nav-item">Moderation</button>
          <button className="sidebar-nav-item">Role Management</button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sidebar-nav">
      <div className="sidebar-search">
        <input
          id="user-search"
          type="text"
          className="sidebar-search-input"
          placeholder="Search users..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">With Roles</div>
        {withRoles.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0 8px 8px' }}>No users found.</div>
        ) : withRoles.map(user => (
          <button
            key={user.qft_uuid}
            className={`sidebar-nav-item${activeUserId === user.qft_uuid ? ' active' : ''}`}
            onClick={() => onUserClick(user.qft_uuid)}
            aria-current={activeUserId === user.qft_uuid ? 'page' : undefined}
          >
            <span className="nav-icon">
              <img src={user.discord_avatar_url} alt={user.discord_username} className="avatar-sm" style={{ borderRadius: '50%', width: 24, height: 24 }} />
            </span>
            <span className="nav-label">{user.discord_username}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">No Roles</div>
        {withoutRoles.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0 8px 8px' }}>No users found.</div>
        ) : withoutRoles.map(user => (
          <button
            key={user.qft_uuid}
            className={`sidebar-nav-item${activeUserId === user.qft_uuid ? ' active' : ''}`}
            onClick={() => onUserClick(user.qft_uuid)}
            aria-current={activeUserId === user.qft_uuid ? 'page' : undefined}
          >
            <span className="nav-icon">
              <img src={user.discord_avatar_url} alt={user.discord_username} className="avatar-sm" style={{ borderRadius: '50%', width: 24, height: 24 }} />
            </span>
            <span className="nav-label">{user.discord_username}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default UsersSmartNav;
