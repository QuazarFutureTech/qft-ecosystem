/**
 * UsersList Component
 * Sidebar list of users for the Users management section
 * Matches the ModuleList pattern from AI Modules
 */

import React, { useState, useMemo } from 'react';
import { FaUser, FaSearch, FaTimes, FaArrowLeft } from 'react-icons/fa';
import CollapsibleCategory from '../../elements/CollapsibleCategory';
import '../../../Layout.css';

function UsersList({ users, activeUserId, sidebarOpen, onCloseSidebar, onUserSelect, onBack, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('username'); // 'username' or 'id'

  // Filter and categorize users
  const categorizedUsers = useMemo(() => {
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

    // Categorize by role status
    const withRoles = filtered.filter(u => u.roles && u.roles.length > 0);
    const withoutRoles = filtered.filter(u => !u.roles || u.roles.length === 0);

    const categories = [];
    
    if (withRoles.length > 0) {
      categories.push({
        title: `With Roles (${withRoles.length})`,
        users: withRoles
      });
    }
    
    if (withoutRoles.length > 0) {
      categories.push({
        title: `No Roles (${withoutRoles.length})`,
        users: withoutRoles
      });
    }

    return categories;
  }, [users, searchTerm, searchType]);

  return (
    <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {/* Back button */}
        {onBack && (
          <button
            className="sidebar-nav-item"
            onClick={() => {
              onBack();
              onCloseSidebar();
            }}
            style={{
              marginBottom: '10px',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '10px'
            }}
          >
            <span className="nav-icon">
              <FaArrowLeft />
            </span>
            <span className="nav-label">Back to Control Panel</span>
          </button>
        )}

        {/* Search controls */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', marginBottom: '10px' }}>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              type="text"
              className="qft-input"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingRight: '30px' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px'
                }}
              >
                <FaTimes />
              </button>
            )}
          </div>
          <select
            className="qft-input"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            style={{ fontSize: '12px', padding: '6px' }}
          >
            <option value="username">Search by Username</option>
            <option value="id">Search by ID</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading users...
          </div>
        ) : categorizedUsers.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No users found
          </div>
        ) : (
          categorizedUsers.map((category, idx) => (
            <CollapsibleCategory
              key={category.title}
              title={category.title}
              defaultOpen={idx === 0}
            >
              {category.users.map((user) => {
                const isActive = activeUserId === user.qft_uuid;
                const displayName = user.discord_username || user.username || 'Unknown User';

                return (
                  <button
                    key={user.qft_uuid}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onUserSelect(user.qft_uuid)}
                    aria-current={isActive ? 'page' : undefined}
                    title={displayName}
                  >
                    <span className="nav-icon">
                      <FaUser />
                    </span>
                    <span className="nav-label" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </CollapsibleCategory>
          ))
        )}
      </nav>
    </aside>
  );
}

export default UsersList;
