// UserManagementModule.jsx - User and Role Assignment Interface
import React, { useState, useEffect } from 'react';
import { FaUser, FaUsers, FaShieldAlt, FaPlus, FaTimes, FaCheck, FaCrown, FaStar, FaKey, FaLock, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { getAllUsers, getUserRoles, assignUserRole, removeUserRole } from '../../services/users';
import { getRoles } from '../../services/permissions';
import { useUser } from '../../contexts/UserContext.jsx';
import { isPrivilegedStaff } from '../../utils/clearance';
import './UserManagementModule.css';

function UserManagementModule() {
  const { userStatus, refreshUserPermissions, qftRole } = useUser();
  const token = localStorage.getItem('qft-token');
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  // Moderation state
  const [accountStatus, setAccountStatus] = useState('active');
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [violations, setViolations] = useState([]);
  const [newViolationReason, setNewViolationReason] = useState('');
  const [showAddViolation, setShowAddViolation] = useState(false);

  const isPrivileged = isPrivilegedStaff(qftRole);

  const getUserIdentifier = (user) => user?.snowflake_id || user?.discord_id || user?.qft_uuid;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserRoles(getUserIdentifier(selectedUser));
      // Load user's moderation data
      const userKey = `user_moderation_${getUserIdentifier(selectedUser)}`;
      const savedModerationData = localStorage.getItem(userKey);
      if (savedModerationData) {
        const data = JSON.parse(savedModerationData);
        setAccountStatus(data.accountStatus || 'active');
        setEscalationLevel(data.escalationLevel || 0);
        setViolations(data.violations || []);
      } else {
        setAccountStatus('active');
        setEscalationLevel(0);
        setViolations([]);
      }
    }
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        getAllUsers(token),
        getRoles(token)
      ]);
      
      setUsers(usersData.users || []);
      setRoles(rolesData.roles || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async (userId) => {
    try {
      const data = await getUserRoles(userId, token);
      setUserRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to load user roles:', error);
    }
  };

  const handleAssignRole = async (roleId) => {
    if (!selectedUser) return;
    
    try {
      setAssigningRole(true);
      const identifier = getUserIdentifier(selectedUser);
      await assignUserRole(identifier, roleId, token);
      await loadUserRoles(identifier);
      await loadData(); // Refresh to update member counts
      setShowRoleSelector(false);
      
      // Trigger permission refresh for all users
      if (refreshUserPermissions) {
        setTimeout(() => refreshUserPermissions(), 500);
      }
      
      alert('Role assigned successfully!');
    } catch (error) {
      console.error('Failed to assign role:', error);
      alert('Failed to assign role: ' + error.message);
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = async (roleId) => {
    if (!selectedUser) return;
    
    if (!confirm('Are you sure you want to remove this role from the user?')) {
      return;
    }
    
    try {
      const identifier = getUserIdentifier(selectedUser);
      await removeUserRole(identifier, roleId, token);
      await loadUserRoles(identifier);
      await loadData(); // Refresh to update member counts
      
      // Trigger permission refresh for all users
      if (refreshUserPermissions) {
        setTimeout(() => refreshUserPermissions(), 500);
      }
      
      alert('Role removed successfully!');
    } catch (error) {
      console.error('Failed to remove role:', error);
      alert('Failed to remove role: ' + error.message);
    }
  };

  const saveModerationData = (newStatus, newEscalation, newViolations) => {
    if (!selectedUser) return;
    const userKey = `user_moderation_${getUserIdentifier(selectedUser)}`;
    const data = {
      accountStatus: newStatus,
      escalationLevel: newEscalation,
      violations: newViolations
    };
    localStorage.setItem(userKey, JSON.stringify(data));
  };

  const handleAddViolation = () => {
    if (!newViolationReason.trim()) {
      alert('Please enter a violation reason');
      return;
    }
    const newViolations = [...violations, {
      id: Date.now(),
      reason: newViolationReason,
      date: new Date().toISOString().split('T')[0],
      severity: 'medium'
    }];
    setViolations(newViolations);
    saveModerationData(accountStatus, escalationLevel, newViolations);
    setNewViolationReason('');
    setShowAddViolation(false);
  };

  const handleRemoveViolation = (violationId) => {
    const newViolations = violations.filter(v => v.id !== violationId);
    setViolations(newViolations);
    saveModerationData(accountStatus, escalationLevel, newViolations);
  };

  const handleStatusChange = (newStatus) => {
    setAccountStatus(newStatus);
    saveModerationData(newStatus, escalationLevel, violations);
  };

  const handleEscalationChange = (newLevel) => {
    setEscalationLevel(newLevel);
    saveModerationData(accountStatus, newLevel, violations);
  };

  const getClearanceIcon = (clearance) => {
    switch(clearance) {
      case 'α': return <FaCrown />;
      case 'Ω': return <FaStar />;
      case '3': return <FaShieldAlt />;
      case '2': return <FaKey />;
      case '1': return <FaLock />;
      default: return <FaUser />;
    }
  };

  const getAvailableRoles = () => {
    const assignedRoleIds = userRoles.map(r => r.id);
    return roles.filter(r => !assignedRoleIds.includes(r.id));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#51cf66';
      case 'suspended': return '#ff922b';
      case 'banned': return '#ff6b6b';
      default: return '#868e96';
    }
  };

  if (loading) {
    return <div className="user-management-loading">Loading users...</div>;
  }

  return (
    <div className="user-management-module">
      <div className="user-management-header">
        <h2><FaUsers /> User Management</h2>
        <p>Assign roles, manage permissions, and handle moderation</p>
      </div>

      <div className="user-management-layout">
        {/* Left Sidebar - User List */}
        <div className="user-sidebar">
          <div className="sidebar-header">
            <h3>Users ({users.length})</h3>
          </div>
          <div className="user-list">
            {users.map(user => (
              <div
                key={getUserIdentifier(user)}
                className={`user-item ${getUserIdentifier(selectedUser) === getUserIdentifier(user) ? 'active' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-avatar">
                  <FaUser />
                </div>
                <div className="user-info">
                  <div className="user-name">{user.username}</div>
                  <div className="user-id">Snowflake: {user.snowflake_id || user.discord_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content - User Details & Roles */}
        <div className="user-content">
          {selectedUser ? (
            <>
              <div className="user-header">
                <div className="user-avatar-large">
                  <FaUser size={48} />
                </div>
                <div className="user-details">
                  <h2>{selectedUser.username}</h2>
                  <div className="user-meta">
                    <span>Snowflake: {selectedUser.snowflake_id || selectedUser.discord_id}</span>
                    <span>Discord ID: {selectedUser.discord_id}</span>
                    {isPrivileged && selectedUser.qft_uuid && (
                      <span style={{ color: 'var(--text-muted)' }}>Internal UUID: {selectedUser.qft_uuid}</span>
                    )}
                    {selectedUser.email && <span>Email: {selectedUser.email}</span>}
                  </div>
                </div>
              </div>

              {/* Roles Section */}
              <div className="user-roles-section">
                <div className="section-header">
                  <h3><FaShieldAlt /> Assigned Roles ({userRoles.length})</h3>
                  <button 
                    className="qft-button small primary"
                    onClick={() => setShowRoleSelector(!showRoleSelector)}
                  >
                    <FaPlus /> Assign Role
                  </button>
                </div>

                {showRoleSelector && (
                  <div className="role-selector">
                    <h4>Select a role to assign:</h4>
                    <div className="role-selector-list">
                      {getAvailableRoles().length > 0 ? (
                        getAvailableRoles().map(role => (
                          <div
                            key={role.id}
                            className="role-selector-item"
                            onClick={() => handleAssignRole(role.id)}
                            style={{ borderLeft: `4px solid ${role.color}` }}
                          >
                            <div className="role-selector-name">
                              {getClearanceIcon(role.clearance_level)} {role.name}
                            </div>
                            <div className="role-selector-level">
                              Level {role.clearance_level}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-roles">All available roles have been assigned to this user.</p>
                      )}
                    </div>
                    <button 
                      className="qft-button small secondary"
                      onClick={() => setShowRoleSelector(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="assigned-roles-list">
                  {userRoles.length > 0 ? (
                    userRoles.map(role => (
                      <div 
                        key={role.id} 
                        className="assigned-role-item"
                        style={{ borderLeft: `4px solid ${role.color}` }}
                      >
                        <div className="role-badge" style={{ backgroundColor: role.color }} />
                        <div className="role-info">
                          <div className="role-name">{role.name}</div>
                          <div className="role-clearance">
                            {getClearanceIcon(role.clearance_level)} Clearance: {role.clearance_level}
                          </div>
                        </div>
                        <button
                          className="remove-role-btn"
                          onClick={() => handleRemoveRole(role.id)}
                          title="Remove role"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-roles-assigned">
                      <FaShieldAlt size={48} opacity={0.3} />
                      <p>This user has no roles assigned.</p>
                      <p>Click "Assign Role" to add a role.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Moderation Section */}
              <div className="user-moderation-section">
                <div className="section-header">
                  <h3><FaExclamationTriangle /> Account Moderation</h3>
                </div>

                {/* Account Status */}
                <div className="moderation-subsection">
                  <label className="qft-label">Account Status</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['active', 'suspended', 'banned'].map(status => (
                      <button
                        key={status}
                        className={`status-button ${accountStatus === status ? 'active' : ''}`}
                        onClick={() => handleStatusChange(status)}
                        style={{
                          backgroundColor: accountStatus === status ? getStatusColor(status) : 'var(--bg-secondary)',
                          color: accountStatus === status ? 'white' : 'var(--text-primary)',
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: accountStatus === status ? 600 : 500,
                          textTransform: 'capitalize'
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: 8, backgroundColor: getStatusColor(accountStatus) + '33', borderRadius: 4, marginBottom: 12 }}>
                    <p style={{ fontSize: 12, margin: 0, color: 'var(--text-primary)' }}>
                      Current Status: <strong style={{ textTransform: 'capitalize' }}>{accountStatus}</strong>
                    </p>
                  </div>
                </div>

                {/* Escalation Level */}
                <div className="moderation-subsection">
                  <label className="qft-label">Escalation Level</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={escalationLevel}
                      onChange={e => handleEscalationChange(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ 
                      fontSize: 16, 
                      fontWeight: 600,
                      padding: '4px 12px',
                      backgroundColor: escalationLevel > 7 ? '#ff6b6b' : escalationLevel > 4 ? '#ff922b' : '#51cf66',
                      color: 'white',
                      borderRadius: 4,
                      minWidth: 40,
                      textAlign: 'center'
                    }}>
                      {escalationLevel}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Level {escalationLevel}: {escalationLevel <= 3 ? 'Low Risk' : escalationLevel <= 6 ? 'Medium Risk' : 'High Risk'}
                  </p>
                </div>

                {/* Violations */}
                <div className="moderation-subsection">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="qft-label">Violations ({violations.length})</label>
                    <button
                      className="qft-button small primary"
                      onClick={() => setShowAddViolation(!showAddViolation)}
                    >
                      <FaPlus /> Add Violation
                    </button>
                  </div>

                  {showAddViolation && (
                    <div style={{ padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 12 }}>
                      <textarea
                        value={newViolationReason}
                        onChange={e => setNewViolationReason(e.target.value)}
                        placeholder="Enter violation reason..."
                        className="qft-input"
                        rows={2}
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="qft-button small primary"
                          onClick={handleAddViolation}
                        >
                          <FaCheck /> Save Violation
                        </button>
                        <button
                          className="qft-button small secondary"
                          onClick={() => setShowAddViolation(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="violations-list">
                    {violations.length > 0 ? (
                      violations.map(violation => (
                        <div
                          key={violation.id}
                          style={{
                            padding: 10,
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 4,
                            marginBottom: 8,
                            borderLeft: '4px solid #ff922b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{violation.reason}</p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{violation.date}</p>
                          </div>
                          <button
                            className="remove-role-btn"
                            onClick={() => handleRemoveViolation(violation.id)}
                            title="Remove violation"
                            style={{ color: '#ff6b6b' }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No violations recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <FaUser size={64} />
              <h3>Select a user to manage roles</h3>
              <p>Choose a user from the list to view and edit their role assignments and moderation status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagementModule;
