// UserManagementModule.jsx - User and Role Assignment Interface
import React, { useState, useEffect } from 'react';
import { FaUser, FaUsers, FaShieldAlt, FaPlus, FaTimes, FaCheck, FaCrown, FaStar, FaKey, FaLock } from 'react-icons/fa';
import { getAllUsers, getUserRoles, assignUserRole, removeUserRole } from '../../services/users';
import { getRoles } from '../../services/permissions';
import { useUser } from '../../contexts/UserContext.jsx';
import './UserManagementModule.css';

function UserManagementModule() {
  const { userStatus, refreshUserPermissions } = useUser();
  const token = localStorage.getItem('qft-token');
  
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserRoles(selectedUser.discord_id);
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
      await assignUserRole(selectedUser.discord_id, roleId, token);
      await loadUserRoles(selectedUser.discord_id);
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
      await removeUserRole(selectedUser.discord_id, roleId, token);
      await loadUserRoles(selectedUser.discord_id);
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

  if (loading) {
    return <div className="user-management-loading">Loading users...</div>;
  }

  return (
    <div className="user-management-module">
      <div className="user-management-header">
        <h2><FaUsers /> User Management</h2>
        <p>Assign roles and manage user permissions</p>
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
                key={user.discord_id}
                className={`user-item ${selectedUser?.discord_id === user.discord_id ? 'active' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-avatar">
                  <FaUser />
                </div>
                <div className="user-info">
                  <div className="user-name">{user.username}</div>
                  <div className="user-id">ID: {user.discord_id}</div>
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
                    <span>Discord ID: {selectedUser.discord_id}</span>
                    {selectedUser.email && <span>Email: {selectedUser.email}</span>}
                  </div>
                </div>
              </div>

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
            </>
          ) : (
            <div className="no-selection">
              <FaUser size={64} />
              <h3>Select a user to manage roles</h3>
              <p>Choose a user from the list to view and edit their role assignments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagementModule;
