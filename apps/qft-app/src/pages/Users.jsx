
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { isPrivilegedStaff } from '../utils/clearance';
import UserDetailView from '../components/modules/users/UserDetailView.jsx';

function UsersSection({ userId: controlledUserId, onUserSelect: controlledOnUserSelect }) {
  const navigate = useNavigate();
  const { qftRole } = useUser();
  const hasAccess = isPrivilegedStaff(qftRole);

  // Live user data state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('qft-token');
        const res = await fetch('http://localhost:3001/api/v1/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        // Map API response to expected shape
        setUsers(data.map(u => ({
          qft_uuid: u.id,
          discord_username: u.name,
          display_name: u.display_name || u.name,
          discord_avatar_url: u.avatar
            ? `https://cdn.discordapp.com/avatars/${u.discord_id}/${u.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png',
          roles: [u.clearance],
          discord_id: u.discord_id || '',
        })));
      } catch (err) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);


  const [internalSelectedUserId, setInternalSelectedUserId] = useState(null);

  useEffect(() => {
    if (users.length > 0 && internalSelectedUserId === null) {
      setInternalSelectedUserId(users[0].qft_uuid);
    }
  }, [users]);

  const activeUserId =
    controlledUserId !== undefined ? controlledUserId : internalSelectedUserId;

  const handleUserSelect =
    controlledOnUserSelect || setInternalSelectedUserId;


  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users by search term (username)
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(u =>
      (u.discord_username || '').toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const withRoles = filteredUsers.filter(u => u.roles && u.roles.length > 0);
  const withoutRoles = filteredUsers.filter(u => !u.roles || u.roles.length === 0);


  if (!hasAccess) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Access Denied</h2>
          <p>You need elevated permissions to access User Management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Loading Users...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Error Loading Users</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const activeUser = users.find((u) => u.qft_uuid === activeUserId);

  // Breadcrumbs logic
  const breadcrumbs = [
    { label: 'Control Panel', path: '/control-panel' },
    { label: 'User Management', path: '/control-panel/users' },
  ];
  if (activeUser) {
    breadcrumbs.push({ label: activeUser.discord_username, path: null });
  }

  // Header logic
  const headerTitle = activeUser
    ? `User: ${activeUser.display_name || activeUser.discord_username}`
    : 'User Management';
  const headerDesc = activeUser
    ? (
        <>
          <span style={{ fontWeight: 500 }}>Discord ID:</span> {activeUser.discord_id}<br />
          <span style={{ fontWeight: 500 }}>Username:</span> {activeUser.discord_username}
        </>
      )
    : 'Manage users, roles, and moderation.';

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{headerTitle}</h1>
          <p>{headerDesc}</p>
        </div>
        <nav className="breadcrumbs">
          <ol className="breadcrumbs-list">
            {breadcrumbs.map((b, i) => (
              <li className="breadcrumb-item" key={b.label}>
                {i > 0 && <span className="breadcrumb-separator">&gt;</span>}
                {b.path && i !== breadcrumbs.length - 1 ? (
                  <button
                    className="breadcrumb-link"
                    type="button"
                    onClick={() => {
                      if (b.path === '/control-panel') {
                        navigate('/control-panel');
                      } else if (b.path) {
                        navigate(b.path);
                      }
                    }}
                  >
                    {b.label}
                  </button>
                ) : (
                  <span className="breadcrumb-current">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="page-layout">
        {/* Sidebar */}
        <aside className="page-sidebar">
          <nav className="sidebar-nav">
            {!activeUser && (
              <>
                {/* Search */}
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
                {/* WITH ROLES */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">With Roles</div>
                  {withRoles.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0 8px 8px' }}>No users found.</div>
                  ) : withRoles.map(user => (
                    <button
                      key={user.qft_uuid}
                      className={`sidebar-nav-item${activeUserId === user.qft_uuid ? ' active' : ''}`}
                      onClick={() => handleUserSelect(user.qft_uuid)}
                      aria-current={activeUserId === user.qft_uuid ? 'page' : undefined}
                    >
                      <span className="nav-icon">
                        <img src={user.discord_avatar_url} alt={user.discord_username} className="avatar-sm" style={{ borderRadius: '50%', width: 24, height: 24 }} />
                      </span>
                      <span className="nav-label">{user.discord_username}</span>
                    </button>
                  ))}
                </div>
                {/* NO ROLES */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">No Roles</div>
                  {withoutRoles.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 0 8px 8px' }}>No users found.</div>
                  ) : withoutRoles.map(user => (
                    <button
                      key={user.qft_uuid}
                      className={`sidebar-nav-item${activeUserId === user.qft_uuid ? ' active' : ''}`}
                      onClick={() => handleUserSelect(user.qft_uuid)}
                      aria-current={activeUserId === user.qft_uuid ? 'page' : undefined}
                    >
                      <span className="nav-icon">
                        <img src={user.discord_avatar_url} alt={user.discord_username} className="avatar-sm" style={{ borderRadius: '50%', width: 24, height: 24 }} />
                      </span>
                      <span className="nav-label">{user.discord_username}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {activeUser && (
              <>
                <button
                  className="sidebar-nav-item"
                  style={{ marginBottom: 16 }}
                  onClick={() => handleUserSelect(null)}
                >
                  <span className="nav-icon">&larr;</span>
                  <span className="nav-label">Back to User List</span>
                </button>
                <div className="sidebar-section" style={{ marginTop: 24 }}>
                  <div className="sidebar-section-title">Actions</div>
                  <button className="sidebar-nav-item">Moderation</button>
                  <button className="sidebar-nav-item">Role Management</button>
                  {/* TODO: Add more user-specific actions here */}
                </div>
              </>
            )}
          </nav>
        </aside>
        {/* Main Content */}
        <section className="page-content" style={{ flex: 1, minWidth: 0 }}>
          {!activeUser && (
            <div className="qft-card" style={{ marginTop: 32 }}>
              <h3>Select a user to view details</h3>
              <p>Choose a user from the list to view their details, manage roles, and perform moderation actions.</p>
            </div>
          )}
          {activeUser && (
            <div className="qft-card" style={{ marginTop: 32, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <img
                  src={activeUser.discord_avatar_url}
                  alt={activeUser.display_name || activeUser.discord_username}
                  className="avatar-lg"
                  style={{ borderRadius: '50%', width: 64, height: 64, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{activeUser.display_name || activeUser.discord_username}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                    @{activeUser.discord_username} &bull; <span style={{ fontFamily: 'monospace' }}>{activeUser.discord_id}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button className="qft-btn">Send Message</button>
                <button className="qft-btn">Moderation</button>
                <button className="qft-btn">View Logs</button>
                <button className="qft-btn">More...</button>
              </div>
              {/* UserDetailView can still be rendered for detailed info */}
              <UserDetailView
                user={activeUser}
                onBack={() => handleUserSelect(null)}
                onUserUpdate={() => {}}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default UsersSection;
