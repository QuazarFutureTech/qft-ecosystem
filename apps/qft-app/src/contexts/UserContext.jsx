import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const UserContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const UserProvider = ({ children }) => { // Removed handleLogout from props
  const navigate = useNavigate(); // Get navigate for logout
  const [userStatus, setUserStatus] = useState(null); // Global state for user status
  const [qftUuid, setQftUuid] = useState(null); // Global state for qftUuid
  const [discordClientId, setDiscordClientId] = useState(null); // Global state for Discord Client ID
  const [userGuilds, setUserGuilds] = useState([]); // Global state for user guilds
  const [userConnections, setUserConnections] = useState([]); // Global state for user connections
  const [qftRole, setQftRole] = useState(null); // Global state for QFT Role (clearance level)
  const [roleName, setRoleName] = useState(null); // Primary role name (Staff, Client, Affiliate, etc.)
  const [allRoles, setAllRoles] = useState([]); // All assigned role names
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Loading state for user data

  // Function to refresh user permissions in real-time
  const refreshUserPermissions = useCallback(async () => {
    const token = localStorage.getItem('qft-token');
    if (!token || !userStatus) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/user/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newRole = data.qft_role;
        const newRoleName = data.role_name;
        const newAllRoles = data.all_roles || [];
        
        // Only update if role has changed
        if (newRole !== qftRole || newRoleName !== roleName) {
          console.log(`🔄 Role changed: ${roleName || 'None'} (${qftRole}) → ${newRoleName || 'Client'} (${newRole})`);
          setQftRole(newRole);
          setRoleName(newRoleName);
          setAllRoles(newAllRoles);
          
          // If user lost all staff roles, redirect away from privileged pages
          const hadStaffAccess = roleName && ['Owner', 'Admin', 'Executive', 'Management', 'Security', 'IT Staff', 'Staff'].includes(roleName);
          const hasStaffAccess = newRoleName && ['Owner', 'Admin', 'Executive', 'Management', 'Security', 'IT Staff', 'Staff'].includes(newRoleName);
          
          if (hadStaffAccess && !hasStaffAccess) {
            const currentPath = window.location.pathname;
            const privilegedPaths = ['/control-panel', '/bot-management', '/command-center'];
            if (privilegedPaths.some(path => currentPath.startsWith(path))) {
              console.log('⚠️ Staff access revoked, redirecting to feed');
              navigate('/feed');
            }
          }
        }
      } else if (response.status === 401) {
        // Token expired, logout
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  }, [userStatus, qftRole, roleName, navigate]);

  // Auto-refresh permissions every 30 seconds
  useEffect(() => {
    if (!userStatus) return;

    const interval = setInterval(() => {
      refreshUserPermissions();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [userStatus, refreshUserPermissions]);

  const logout = () => { // Defined logout function internally
    localStorage.removeItem('qft-token');
    setUserStatus(null);
    setQftUuid(null);
    setDiscordClientId(null);
    setUserGuilds([]);
    setUserConnections([]); // Clear userConnections on logout
    setQftRole(null); // Clear qftRole on logout
    setRoleName(null); // Clear role name
    setAllRoles([]); // Clear all roles
    setIsLoadingUser(false);
    navigate('/login');
  };

  // Provide user-related data and setters to consumers
  const contextValue = {
    userStatus,
    setUserStatus,
    qftUuid,
    setQftUuid,
    discordClientId,
    setDiscordClientId,
    userGuilds,
    setUserGuilds,
    userConnections, // Provided userConnections
    setUserConnections, // Provided setUserConnections
    qftRole, // Provided qftRole (clearance level)
    setQftRole, // Provided setQftRole
    roleName, // Primary role name
    setRoleName,
    allRoles, // All assigned roles
    setAllRoles,
    isLoadingUser,
    setIsLoadingUser,
    logout, // Provided logout function
    refreshUserPermissions, // Manual permission refresh
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
