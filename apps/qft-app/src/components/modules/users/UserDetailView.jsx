import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaCheck, FaCrown, FaStar, FaShieldAlt, FaKey, FaLock, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { getUserRoles, assignUserRole, removeUserRole } from '../../../services/users';
import { getRoles } from '../../../services/permissions';
import './Users.css';

const UserDetailView = ({ user, onBack, onUserUpdate }) => {
  const token = localStorage.getItem('qft-token');
  
  const [userRoles, setUserRoles] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Moderation state
  const [accountStatus, setAccountStatus] = useState('active');
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [violations, setViolations] = useState([]);
  const [newViolationReason, setNewViolationReason] = useState('');
  const [showAddViolation, setShowAddViolation] = useState(false);

  const getUserIdentifier = (user) => user?.snowflake_id || user?.discord_id || user?.qft_uuid;

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        setLoading(true);
        // Load roles
        const roleData = await getUserRoles(getUserIdentifier(user), token);
        setUserRoles(roleData.roles || []);
        
        // Load all available roles
        const allRolesData = await getRoles(token);
        setAllRoles(allRolesData.roles || []);
        
        // Load moderation data from localStorage
        const userKey = `user_moderation_${getUserIdentifier(user)}`;
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
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, token]);

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

  const getAvailableRoles = () => {
    const assignedRoleIds = userRoles.map(r => r.id);
    return allRoles.filter(r => !assignedRoleIds.includes(r.id));
  };

  const handleAssignRole = async (roleId) => {
    if (!user) return;
    try {
      const identifier = getUserIdentifier(user);
      await assignUserRole(identifier, roleId, token);
      const roleData = await getUserRoles(identifier, token);
      setUserRoles(roleData.roles || []);
      setShowRoleSelector(false);
    } catch (error) {
      console.error('Failed to assign role:', error);
      alert('Failed to assign role: ' + error.message);
    }
  };

  const handleRemoveRole = async (roleId) => {
    if (!user) return;
    if (!confirm('Remove this role from the user?')) return;
    try {
      const identifier = getUserIdentifier(user);
      await removeUserRole(identifier, roleId, token);
      const roleData = await getUserRoles(identifier, token);
      setUserRoles(roleData.roles || []);
    } catch (error) {
      console.error('Failed to remove role:', error);
      alert('Failed to remove role: ' + error.message);
    }
  };

  const saveModerationData = (newStatus, newEscalation, newViolations) => {
    if (!user) return;
    const userKey = `user_moderation_${getUserIdentifier(user)}`;
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#51cf66';
      case 'suspended': return '#ff922b';
      case 'banned': return '#ff6b6b';
      default: return '#868e96';
    }
  };

  if (!user) {
    return <div>Select a user to see details.</div>;
  }

  if (loading) {
    return <div className="qft-card">Loading user data...</div>;
  }

  return (
    <div className="user-detail-view">
      <div className="qft-card">
        <div className="user-profile-header">
          <img src={user.discord_avatar_url} alt={`${user.discord_username}'s avatar`} className="avatar" />
          <h2>{user.discord_username}</h2>
          <span className="user-id">ID: {user.qft_uuid}</span>
        </div>
      </div>

      {/* Role Management */}
      <div className="qft-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}><FaShieldAlt /> Role Management</h3>
          <button 
            className="qft-button small primary"
            onClick={() => setShowRoleSelector(!showRoleSelector)}
          >
            <FaPlus /> Assign Role
          </button>
        </div>

        {showRoleSelector && (
          <div style={{ padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 12 }}>
            <h4 style={{ marginTop: 0 }}>Select a role to assign:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {getAvailableRoles().length > 0 ? (
                getAvailableRoles().map(role => (
                  <div
                    key={role.id}
                    onClick={() => handleAssignRole(role.id)}
                    style={{
                      padding: 10,
                      borderLeft: `4px solid ${role.color}`,
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{getClearanceIcon(role.clearance_level)} {role.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Level {role.clearance_level}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>All roles assigned to this user.</p>
              )}
            </div>
            <button 
              className="qft-button small secondary"
              onClick={() => setShowRoleSelector(false)}
              style={{ marginTop: 8 }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {userRoles.length > 0 ? (
            userRoles.map(role => (
              <div 
                key={role.id} 
                style={{
                  padding: 12,
                  borderLeft: `4px solid ${role.color}`,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{role.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {getClearanceIcon(role.clearance_level)} Clearance: {role.clearance_level}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveRole(role.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ff6b6b',
                    fontSize: 18
                  }}
                  title="Remove role"
                >
                  <FaTimes />
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No roles assigned.</p>
          )}
        </div>
      </div>

      {/* Moderation */}
      <div className="qft-card">
        <h3 style={{ marginTop: 0 }}><FaExclamationTriangle /> Account Moderation</h3>

        {/* Account Status */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Account Status</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['active', 'suspended', 'banned'].map(status => (
              <button
                key={status}
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
        </div>

        {/* Escalation Level */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Escalation Level</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
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
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontWeight: 600, margin: 0 }}>Violations ({violations.length})</label>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {violations.length > 0 ? (
              violations.map(violation => (
                <div
                  key={violation.id}
                  style={{
                    padding: 10,
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 4,
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
                    onClick={() => handleRemoveViolation(violation.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ff6b6b',
                      fontSize: 16
                    }}
                    title="Remove violation"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 12 }}>No violations recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailView;