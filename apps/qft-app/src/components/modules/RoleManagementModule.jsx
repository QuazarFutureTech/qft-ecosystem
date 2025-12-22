import React, { useState, useEffect } from 'react';
import { FaUserShield, FaSave, FaTimesCircle } from 'react-icons/fa';
import { useUser } from '../../contexts/UserContext.jsx';
import { fetchUsers, updateUserRole, fetchGuildRoles, updateUserDiscordRole } from '../../services/admin'; // Import new admin services
import Modal from '../elements/Modal'; // Import the Modal component

function RoleManagementModule() {
  const { userStatus, userGuilds } = useUser(); // Get userGuilds from context
  const [appUsers, setAppUsers] = useState([]); // Renamed 'users' to 'appUsers' for clarity
  const [appUsersLoading, setAppUsersLoading] = useState(true);
  const [appUsersError, setAppUsersError] = useState(null);

  // States for Discord Role Management
  const [selectedDiscordGuildId, setSelectedDiscordGuildId] = useState('');
  const [discordGuildRoles, setDiscordGuildRoles] = useState([]);
  const [discordGuildMembers, setDiscordGuildMembers] = useState([]); // Will need a separate API for this
  const [discordRolesLoading, setDiscordRolesLoading] = useState(false);
  const [discordRolesError, setDiscordRolesError] = useState(null);
  const [discordMembersLoading, setDiscordMembersLoading] = useState(false); // For future use
  const [discordMembersError, setDiscordMembersError] = useState(null); // For future use

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalConfirmAction, setModalConfirmAction] = useState(null); // Function to call if confirmed

  // Safety check: ensure userGuilds is defined
  const safeUserGuilds = userGuilds || [];

  // Debug log to verify the fix is loaded
  React.useEffect(() => {
    console.log('[RoleManagementModule] userGuilds:', userGuilds, 'safeUserGuilds:', safeUserGuilds);
  }, [userGuilds, safeUserGuilds]);

  const confirmAction = (message, isConfirm = true, title = "Confirmation") => {
    return new Promise((resolve) => {
      setModalTitle(title);
      setModalMessage(message);
      setIsModalOpen(true);
      setModalConfirmAction(() => (confirmed) => {
        setIsModalOpen(false);
        resolve(confirmed);
      });
    });
  };

  // Effect to load application users
  useEffect(() => {
    if (userStatus?.isAdmin) {
      const loadAppUsers = async () => {
        try {
          setAppUsersLoading(true);
          const token = localStorage.getItem('qft-token');
          if (!token) {
            await confirmAction("No authentication token found.", false, "Error");
            setAppUsersLoading(false);
            return;
          }
          const result = await fetchUsers(token);
          if (result.success) {
            setAppUsers(result.data);
          } else {
            setAppUsersError(new Error(result.message));
            await confirmAction(result.message, false, "Error");
          }
        } catch (err) {
          setAppUsersError(err);
          await confirmAction(`Error loading application users: ${err.message}`, false, "Error");
        } finally {
          setAppUsersLoading(false);
        }
      };
      loadAppUsers();
    } else {
      setAppUsersLoading(false);
      setAppUsers([]);
    }
  }, [userStatus]);

  // Effect to set initial selected Discord guild
  useEffect(() => {
    if (userStatus?.isOwner && safeUserGuilds.length > 0 && !selectedDiscordGuildId) {
      setSelectedDiscordGuildId(safeUserGuilds[0].id);
    }
  }, [userStatus, safeUserGuilds, selectedDiscordGuildId]);

  // Effect to load Discord guild roles when selectedDiscordGuildId changes
  useEffect(() => {
    const loadDiscordGuildRoles = async () => {
      if (!selectedDiscordGuildId || !userStatus?.isOwner) {
        setDiscordGuildRoles([]);
        return;
      }

      setDiscordRolesLoading(true);
      setDiscordRolesError(null);
      try {
        const token = localStorage.getItem('qft-token');
        if (!token) {
          setDiscordRolesError(new Error("Authentication token not found."));
          setDiscordRolesLoading(false);
          return;
        }
        const result = await fetchGuildRoles(selectedDiscordGuildId, token);
        if (result.success) {
          setDiscordGuildRoles(result.data);
        } else {
          setDiscordRolesError(new Error(result.message));
          await confirmAction(result.message, false, "Error fetching Discord roles");
        }
      } catch (err) {
        setDiscordRolesError(err);
        await confirmAction(`Error fetching Discord roles: ${err.message}`, false, "Error");
      } finally {
        setDiscordRolesLoading(false);
      }
    };
    if (userGuilds) {
      loadDiscordGuildRoles();
    }
  }, [selectedDiscordGuildId, userStatus, userGuilds]);

  const handleAppRoleChange = (userId, newRole) => {
    setAppUsers(prevUsers =>
      prevUsers.map(user => (user.id === userId ? { ...user, role: newRole } : user))
    );
  };

  const handleSaveAppRole = async (userId, newRole) => {
    const isConfirmed = await confirmAction(`Are you sure you want to update the application role for this user to "${newRole}"?`);
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('qft-token');
      if (!token) {
        await confirmAction("No authentication token found.", false, "Error");
        return;
      }
      const result = await updateUserRole(userId, newRole, token);
      if (result.success) {
        await confirmAction(result.message, false, "Success");
      } else {
        await confirmAction(result.message, false, "Error");
      }
    } catch (err) {
      console.error("Failed to update application role:", err);
      await confirmAction(`An error occurred: ${err.message}`, false, "Error");
    }
  };

  const handleUpdateDiscordMemberRole = async (memberDiscordId, newRoleId) => {
    const isConfirmed = await confirmAction(`Are you sure you want to update the Discord role for this member?`);
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('qft-token');
      if (!token) {
        await confirmAction("No authentication token found.", false, "Error");
        return;
      }
      if (!selectedDiscordGuildId) {
        await confirmAction("Please select a Discord guild first.", false, "Error");
        return;
      }
      const result = await updateUserDiscordRole(selectedDiscordGuildId, memberDiscordId, newRoleId, token);
      if (result.success) {
        await confirmAction(result.message, false, "Success");
        // Optionally re-fetch members/roles to reflect changes
      } else {
        await confirmAction(result.message, false, "Error");
      }
    } catch (err) {
      console.error("Failed to update Discord member role:", err);
      await confirmAction(`An error occurred: ${err.message}`, false, "Error");
    }
  };

  if (!userStatus?.isAdmin) { // Only render module if user is at least an admin
    return null;
  }

  if (appUsersLoading) {
    return <div className="qft-card">Loading application user roles...</div>;
  }

  // Safety check for appUsers
  const safeAppUsers = appUsers || [];

  return (
    <div className="qft-card" style={{ marginTop: '20px' }}>
      <h2><FaUserShield /> User Role Management</h2>

      {/* Application Role Management (for all admins) */}
      <h3>Application Roles</h3>
      {safeAppUsers.length === 0 ? (
        <p>No application users found or available for role management.</p>
      ) : (
        <ul className="guild-list">
          {safeAppUsers.map(user => (
            <li key={user.id} className="guild-entry" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: '10px' }}>{user.global_name || user.username}</span>
                <select
                  value={user.role}
                  onChange={(e) => handleAppRoleChange(user.id, e.target.value)}
                  className="qft-button"
                  style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.8em' }}
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => handleSaveAppRole(user.id, user.role)}
                  className="qft-button"
                  style={{ backgroundColor: 'var(--accent-primary)', padding: '5px 10px', fontSize: '0.8em' }}
                >
                  <FaSave /> Save
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Discord Role Management (only for owner) */}
      {userStatus?.isOwner && (
        <>
          <h3 style={{ marginTop: '30px' }}>Discord Guild Role Management</h3>
          {safeUserGuilds.length === 0 ? (
            <p>Bot is not in any mutual guilds to manage roles.</p>
          ) : (
            <>
              <label htmlFor="discord-guild-select" style={{ marginBottom: '5px', display: 'block' }}>Select Discord Guild:</label>
              <select
                id="discord-guild-select"
                value={selectedDiscordGuildId}
                onChange={(e) => setSelectedDiscordGuildId(e.target.value)}
                className="qft-select"
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid var(--border-color)', marginBottom: '15px' }}
              >
                {safeUserGuilds.map(guild => (
                  <option key={guild.id} value={guild.id}>
                    {guild.name}
                  </option>
                ))}
              </select>

              {selectedDiscordGuildId && (
                <>
                  <h4>Members & Roles in {safeUserGuilds.find(g => g.id === selectedDiscordGuildId)?.name}</h4>
                  {discordRolesLoading ? (
                    <p>Loading Discord roles...</p>
                  ) : discordRolesError ? (
                    <p className="error-message">Error loading Discord roles: {discordRolesError.message}</p>
                  ) : discordGuildRoles.length === 0 ? (
                    <p>No roles found or bot lacks permission to view roles.</p>
                  ) : (
                    <ul className="guild-list">
                      {/* For now, we use appUsers as a proxy for Discord members. 
                          Ideally, this would be a fetch to /api/v1/admin/guilds/:guildId/members */}
                      {safeAppUsers.map(user => (
                        <li key={user.id} className="guild-entry" style={{ justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '10px' }}>{user.username}</span> {/* Assuming appUsers have discord usernames */}
                            <select
                              defaultValue={''} // Or current Discord role if fetched
                              onChange={(e) => handleUpdateDiscordMemberRole(user.discord_id, e.target.value)}
                              className="qft-button"
                              style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.8em' }}
                            >
                              <option value="">Select Role</option>
                              {discordGuildRoles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                              ))}
                            </select>
                            <button
                                onClick={() => handleUpdateDiscordMemberRole(user.discord_id, selectedDiscordGuildId)} // Need to pass role ID here. This needs refinement
                                className="qft-button"
                                style={{ backgroundColor: 'var(--accent-primary)', padding: '5px 10px', fontSize: '0.8em' }}
                            >
                                <FaSave /> Update
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => modalConfirmAction(false)} // Pass false if modal is closed without action
        title={modalTitle}
      >
        <p>{modalMessage}</p>
        {modalTitle === "Confirmation" && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => modalConfirmAction(false)} className="qft-button" style={{ marginRight: '10px', backgroundColor: 'var(--accent-secondary)', color: 'white' }}>
              Cancel
            </button>
            <button onClick={() => modalConfirmAction(true)} className="qft-button" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
              Confirm
            </button>
          </div>
        )}
         {modalTitle !== "Confirmation" && ( // For alerts (Success/Error messages)
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => modalConfirmAction(true)} className="qft-button" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
              OK
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default RoleManagementModule;
