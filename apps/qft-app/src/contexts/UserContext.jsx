import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const UserContext = createContext(null);

// Pull configuration from Environment Variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// 🔒 The Owner ID is now hidden in your .env file
const ALPHA_OWNER_ID = import.meta.env.VITE_ALPHA_OWNER_ID; 

export const UserProvider = ({ children }) => {
  const navigate = useNavigate();
  const [userStatus, setUserStatus] = useState(null); 
  const [qftUuid, setQftUuid] = useState(null); 
  const [discordClientId, setDiscordClientId] = useState(null); 
  const [userGuilds, setUserGuilds] = useState([]); 
  const [userConnections, setUserConnections] = useState([]); 
  const [qftRole, setQftRole] = useState(null); 
  const [roleName, setRoleName] = useState(null); 
  const [allRoles, setAllRoles] = useState([]); 
  const [isLoadingUser, setIsLoadingUser] = useState(true); 

  // --- Fetch Bot Guilds ---
  const fetchBotGuilds = useCallback(async () => {
    const token = localStorage.getItem('qft-token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/discord/guilds`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Always set as array
        setUserGuilds(Array.isArray(data) ? data : []);
        console.log('✅ Fetched bot guilds:', Array.isArray(data) ? data.length : 0);
      } else {
        console.error('Failed to fetch bot guilds:', response.status);
        setUserGuilds([]);
      }
    } catch (error) {
      console.error('Error fetching bot guilds:', error);
      setUserGuilds([]);
    }
  }, []); 

  // --- Refresh Permissions (With God Mode Override) ---
  const refreshUserPermissions = useCallback(async () => {
    const token = localStorage.getItem('qft-token');
    if (!token || !userStatus) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/user/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        let newRole = data.qft_role;
        let newRoleName = data.role_name;
        let newAllRoles = data.all_roles || [];

        // 1. DATABASE CHECK: Standard verification
        if (data.is_owner === true) {
          newRole = 'alpha_owner';
        }

        // 2. GOD MODE CHECK: Environment Variable Override
        // This compares your logged-in ID with the hidden Env Var
        if (ALPHA_OWNER_ID && userStatus.id === ALPHA_OWNER_ID) {
            console.log("🔒 Alpha Owner Override Active: God Mode Enabled");
            newRole = 'alpha_owner';
            newRoleName = 'Owner';
            
            // Force inject ALL critical hierarchy roles
            const forcedRoles = ['Owner', 'Admin', 'Staff', 'Executive', 'Management'];
            forcedRoles.forEach(r => {
                if (!newAllRoles.includes(r)) newAllRoles.push(r);
            });
        }

        // Only update if role has changed
        if (newRole !== qftRole || newRoleName !== roleName) {
          console.log(`🔄 Role changed: ${roleName || 'None'} (${qftRole}) → ${newRoleName || 'Client'} (${newRole})`);
          setQftRole(newRole);
          setRoleName(newRoleName);
          setAllRoles(newAllRoles);

          // Redirect Logic if Staff access is lost
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
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  }, [userStatus, qftRole, roleName, navigate]);

  // --- Auto-Refresh Loop ---
  useEffect(() => {
    const token = localStorage.getItem('qft-token');
    if (!userStatus || !token) return;

    fetchBotGuilds();

    const interval = setInterval(() => {
      refreshUserPermissions();
    }, 30000); 

    return () => clearInterval(interval);
  }, [userStatus, refreshUserPermissions, fetchBotGuilds]);

  // --- Logout Function ---
  const logout = () => { 
    localStorage.removeItem('qft-token');
    setUserStatus(null);
    setQftUuid(null);
    setDiscordClientId(null);
    setUserGuilds([]);
    setUserConnections([]); 
    setQftRole(null); 
    setRoleName(null); 
    setAllRoles([]); 
    setIsLoadingUser(false);
    navigate('/login');
  };

  const contextValue = {
    userStatus, setUserStatus,
    qftUuid, setQftUuid,
    discordClientId, setDiscordClientId,
    userGuilds, setUserGuilds,
    userConnections, setUserConnections,
    qftRole, setQftRole,
    roleName, setRoleName,
    allRoles, setAllRoles,
    isLoadingUser, setIsLoadingUser,
    logout,
    refreshUserPermissions,
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