import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import { FaShieldAlt, FaUsers, FaCrown, FaStar, FaKey, FaLock } from 'react-icons/fa';
import { CLEARANCE_LEVELS, ACCOUNT_TYPES, getClearanceLabel } from '../../utils/clearance';
import { getRoles, getPermissions, getRolePermissions, updateRolePermissions } from '../../services/permissions';
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

  return (
    <div className="permissions-module">
      <div className="permissions-layout">
        {/* Left Sidebar - Role/User List */}
        <div className="permissions-sidebar">
          <div className="sidebar-header">
            <h3>Roles</h3>
          </div>
          <div className="sidebar-list">
            {roles.map(role => (
              <div
                key={role.id}
                className={`role-item ${selectedRole?.id === role.id ? 'active' : ''}`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="role-color" style={{ backgroundColor: role.color }} />
                <div className="role-info">
                  <div className="role-name">{role.name}</div>
                  <div className="role-meta">
                    <span className="clearance-badge-small">
                      {getClearanceIcon(role.clearance_level)} {role.clearance_level}
                    </span>
                    <span className="member-count">{role.members} members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - Permissions */}
        <div className="permissions-content">
          {selectedRole ? (
            <>
              <div className="role-header">
                <div className="role-color-large" style={{ backgroundColor: selectedRole.color }} />
                <div className="role-details">
                  <h2>{selectedRole.name}</h2>
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
                  {/* Render permissions by category */}
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

              <div className="permissions-footer">
                <button className="qft-button secondary" disabled title="Role creation coming soon">
                  + New Role
                </button>
                <button className="qft-button secondary" onClick={() => loadRolePermissions(selectedRole.id)}>Reset to Current</button>
                <button className="qft-button primary" onClick={handleSavePermissions} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
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
    </div>
  );
}

export default PermissionsModule;
