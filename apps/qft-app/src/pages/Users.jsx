import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import { isPrivilegedStaff } from '../utils/clearance';
import UserDetailView from '../components/modules/users/UserDetailView.jsx';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import UsersSmartNav from './UsersSmartNav.jsx';

function UsersSection({ userId: controlledUserId, onUserSelect: controlledOnUserSelect }) {
  const navigate = useNavigate();
  const { qftRole } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();
  const hasAccess = isPrivilegedStaff(qftRole);

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
  }, [users, internalSelectedUserId]);

  const activeUserId = controlledUserId !== undefined ? controlledUserId : internalSelectedUserId;
  const handleUserSelect = controlledOnUserSelect || setInternalSelectedUserId;

  const [searchTerm, setSearchTerm] = useState('');
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(u =>
      (u.discord_username || '').toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const withRoles = useMemo(() => filteredUsers.filter(u => u.roles && u.roles.length > 0), [filteredUsers]);
  const withoutRoles = useMemo(() => filteredUsers.filter(u => !u.roles || u.roles.length === 0), [filteredUsers]);
  const activeUser = users.find((u) => u.qft_uuid === activeUserId);

  const breadcrumbItems = useMemo(() => {
    const items = [
      { label: 'Control Panel', path: '/control-panel' },
      { label: 'User Management', path: '/control-panel/users' },
    ];
    if (activeUser) {
      items.push({ label: activeUser.discord_username, path: null });
    }
    return items;
  }, [activeUser]);

  const headerTitle = activeUser ? `User: ${activeUser.display_name || activeUser.discord_username}` : 'User Management';
  const headerDesc = activeUser ? (
    <>
      <span style={{ fontWeight: 500 }}>Discord ID:</span> {activeUser.discord_id}<br />
      <span style={{ fontWeight: 500 }}>Username:</span> {activeUser.discord_username}
    </>
  ) : 'Manage users, roles, and moderation.';

  useEffect(() => {
    if (!hasAccess) return;
    setHeaderContent({
      title: headerTitle,
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} navigate={navigate} />,
    });
    return () => setHeaderContent(null);
  }, [setHeaderContent, headerTitle, breadcrumbItems, navigate, hasAccess]);

  useEffect(() => {
    setSmartNavContent(
      <UsersSmartNav
        activeUser={activeUser}
        activeUserId={activeUserId}
        handleUserSelect={handleUserSelect}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        withRoles={withRoles}
        withoutRoles={withoutRoles}
        onClose={closeSmartNav}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, activeUser, activeUserId, handleUserSelect, searchTerm, withRoles, withoutRoles, closeSmartNav]);


  if (!hasAccess) {
    return <div className="qft-card"><h2>Access Denied</h2><p>You need elevated permissions to access User Management.</p></div>;
  }
  if (loading) {
    return <div className="qft-card"><h2>Loading Users...</h2></div>;
  }
  if (error) {
    return <div className="qft-card"><h2>Error Loading Users</h2><p>{error}</p></div>;
  }

  return (
    <>
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
          <UserDetailView
            user={activeUser}
            onBack={() => handleUserSelect(null)}
            onUserUpdate={() => {}}
          />
        </div>
      )}
    </>
  );
}

export default UsersSection;
