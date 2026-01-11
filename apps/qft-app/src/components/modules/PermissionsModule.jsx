import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import { FaShieldAlt, FaUsers, FaCrown, FaStar, FaKey, FaLock } from 'react-icons/fa';
import { CLEARANCE_LEVELS, ACCOUNT_TYPES, getClearanceLabel } from '../../utils/clearance';
import { getRoles, getPermissions, getRolePermissions, updateRolePermissions, createRole, deleteRole } from '../../services/permissions';
import { useUser } from '../../contexts/UserContext.jsx';
import './PermissionsModule.css';

function PermissionsModule() {
  const { userStatus } = useUser();
  const token = localStorage.getItem('qft-token');
  const [selectedRole, setSelectedRole] = useState(null);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    name: '',
    clearance_level: '1',
    color: '#6366f1',
    description: ''
  });

  const getUserIdentifier = (user) => user?.snowflake_id || user?.discord_id || user?.qft_uuid;

  // Load roles and permissions on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load role permissions when a role is selected
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        getRoles(token),
        getPermissions(token)
      ]);
      
      setRoles(rolesData.roles.map(r => ({
        ...r,
        members: r.member_count || 0
      })));
      
      // Group permissions by category
      const grouped = permsData.permissions.reduce((acc, perm) => {
        if (!acc[perm.category]) {
          acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
      }, {});
      
      setAllPermissions(grouped);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId) => {
    try {
      const data = await getRolePermissions(roleId, token);
      const permsMap = {};
      data.permissions.forEach(p => {
        permsMap[p.permission_key] = p.enabled;
      });
      setRolePermissions(permsMap);
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      setSaving(true);
      await updateRolePermissions(selectedRole.id, rolePermissions, token);
      alert('Permissions updated successfully!');
    } catch (error) {
      console.error('Failed to save permissions:', error);
      alert('Failed to save permissions: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleData.name.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      setCreatingRole(true);
      const response = await createRole(newRoleData, token);
      alert('Role created successfully!');
      setNewRoleData({ name: '', clearance_level: '1', color: '#6366f1', description: '' });
      setShowCreateForm(false);
      await loadData();
      setSelectedRole(response.role || null);
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('Failed to create role: ' + error.message);
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteRole(roleId, token);
      alert('Role deleted successfully!');
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role: ' + error.message);
    }
  };

  const togglePermission = (permId) => {
    setRolePermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  const getClearanceIcon = (clearance) => {
    switch(clearance) {
      case 'α': return <FaCrown />;
      case 'Ω': return <FaStar />;
      case '3': return <FaShieldAlt />;
      case '2': return <FaKey />;
      case '1': return <FaLock />;
      default: return <FaShieldAlt />;
    }
  };

  const tabStyle = {
    padding: '10px 16px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    background: 'none',
    color: 'var(--text-primary)',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  };

  const activeTabStyle = {
    ...tabStyle,
    fontWeight: 600,
    color: 'var(--accent-primary)',
    borderBottomColor: 'var(--accent-primary)'
  };

  return (
    <div className="permissions-module">
      <>
        {/* Create Role Modal */}
        {showCreateForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowCreateForm(false)}>
            <div style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: 22, fontWeight: 600 }}>Create New Role</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Role Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Moderator"
                    value={newRoleData.name}
                    onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-muted)' }}>
                      Clearance Level
                    </label>
                    <select
                      value={newRoleData.clearance_level}
                      onChange={(e) => setNewRoleData({ ...newRoleData, clearance_level: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                      <option value="Ω">Admin (Ω)</option>
                      <option value="α">Owner (α)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-muted)' }}>
                      Color
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="color"
                        value={newRoleData.color}
                        onChange={(e) => setNewRoleData({ ...newRoleData, color: e.target.value })}
                        style={{
                          width: 50,
                          height: 44,
                          padding: 2,
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {newRoleData.color}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-muted)' }}>
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="What is this role for?"
                    value={newRoleData.description}
                    onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      fontSize: 14,
                      resize: 'vertical',
                      minHeight: 100,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    className="qft-button primary"
                    onClick={handleCreateRole}
                    disabled={creatingRole}
                    style={{ flex: 1 }}
                  >
                    {creatingRole ? 'Creating...' : 'Create Role'}
                  </button>
                  <button
                    className="qft-button secondary"
                    onClick={() => setShowCreateForm(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="permissions-layout">
        {/* Left Sidebar */}
        <div className="permissions-sidebar">
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Roles</h3>
          </div>

          <div className="sidebar-list" style={{ position: 'relative', paddingBottom: '60px' }}>
            {roles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 12 }}>
                No roles found. Create one to get started!
              </div>
            ) : (
              roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: selectedRole?.id === role.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    borderLeft: `4px solid ${role.color}`,
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: selectedRole?.id === role.id ? 1 : 0.7,
                    color: selectedRole?.id === role.id ? 'white' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRole?.id !== role.id) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRole?.id !== role.id) {
                      e.currentTarget.style.opacity = '0.7';
                    }
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{role.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, display: 'flex', gap: 8 }}>
                      <span>{getClearanceIcon(role.clearance_level)} {role.clearance_level}</span>
                      <span>•</span>
                      <span>{role.members} member{role.members !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Fixed Create Role Button */}
          <button
            className="qft-button primary"
            onClick={() => setShowCreateForm(true)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              padding: '12px',
              borderRadius: '0 0 8px 8px',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
            }}
          >
            + Create New Role
          </button>
        </div>

        {/* Main Content */}
        <div className="permissions-content">
          {selectedRole ? (
            <>
              <div className="role-header">
                <div className="role-color-large" style={{ backgroundColor: selectedRole.color }} />
                <div className="role-details">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={selectedRole.name}
                        onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                        style={{
                          fontSize: 24,
                          fontWeight: 600,
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-primary)',
                          padding: 0,
                          marginBottom: 8,
                          width: '100%'
                        }}
                      />
                    </div>
                    <input
                      type="color"
                      value={selectedRole.color}
                      onChange={(e) => setSelectedRole({ ...selectedRole, color: e.target.value })}
                      style={{
                        width: 40,
                        height: 40,
                        padding: 2,
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      title="Change role color"
                    />
                  </div>
                  <div className="role-info-bar">
                    <span className="clearance-display">
                      {getClearanceIcon(selectedRole.clearance_level)} 
                      Clearance Level: <strong>{getClearanceLabel(selectedRole.clearance_level)}</strong>
                    </span>
                    <span className="member-count-display">
                      <FaUsers /> {selectedRole.members} members
                    </span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>Loading permissions...</div>
              ) : (
                <div className="permissions-sections">
                  {Object.entries(allPermissions).map(([category, perms]) => (
                    <div 
                      key={category} 
                      className={`permission-category ${category === 'privileged' ? 'privileged' : ''} ${category === 'advanced' ? 'dangerous' : ''}`}
                    >
                      <h3 className="category-title">
                        {category === 'privileged' && <FaShieldAlt />}
                        {category === 'advanced' && <FaLock />}
                        {' '}{category.charAt(0).toUpperCase() + category.slice(1)} Permissions
                      </h3>
                      {category === 'advanced' && (
                        <p className="category-warning">
                          ⚠️ These permissions grant significant system access and should only be assigned to highly trusted roles.
                        </p>
                      )}
                      <div className="permission-list">
                        {perms.map(perm => (
                          <div key={perm.id} className="permission-item">
                            <div className="permission-info">
                              <div className="permission-label">{perm.label}</div>
                              <div className="permission-description">{perm.description}</div>
                            </div>
                            <Switch
                              checked={rolePermissions[perm.permission_key] || false}
                              onChange={() => togglePermission(perm.permission_key)}
                              ariaLabel={`Toggle ${perm.label} permission`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="permissions-footer" style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 24 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="qft-button secondary" onClick={() => loadRolePermissions(selectedRole.id)} style={{ fontSize: 13 }}>
                    ↺ Reset
                  </button>
                  <button className="qft-button primary" onClick={handleSavePermissions} disabled={saving} style={{ fontSize: 13 }}>
                    {saving ? '⏳ Saving...' : '✓ Save Changes'}
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteRole(selectedRole.id)}
                  disabled={selectedRole.clearance_level === 'α'}
                  style={{
                    backgroundColor: selectedRole.clearance_level === 'α' ? '#999' : '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 4,
                    cursor: selectedRole.clearance_level === 'α' ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: selectedRole.clearance_level === 'α' ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRole.clearance_level !== 'α') {
                      e.target.style.backgroundColor = '#ff5252';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRole.clearance_level !== 'α') {
                      e.target.style.backgroundColor = '#ff6b6b';
                    }
                  }}
                  title={selectedRole.clearance_level === 'α' ? 'Owner role cannot be deleted' : 'Delete this role'}
                >
                  🗑 Delete Role
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <FaShieldAlt size={64} />
              <h3>Select a role to manage permissions</h3>
              <p>Choose a role from the list to view and edit its permissions</p>
            </div>
          )}
        </div>
      </div>
      </>
    </div>
  );
}

export default PermissionsModule;
