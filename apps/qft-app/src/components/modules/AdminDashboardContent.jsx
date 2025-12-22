import React, { useState, useEffect } from 'react';
import Switch from '../elements/Switch';
import ProfileModule from './ProfileModule';
import OrdersModule from './OrdersModule';
import BotControlModule from './BotControlModule';
import PortalModule from './PortalModule';
import AnalyticsModule from './AnalyticsModule';
import TicketDashboard from './TicketDashboard';
import EmbedBuilderModule from './EmbedBuilderModule';
import WorkerBuilder from './WorkerBuilder';
import PermissionsModule from './PermissionsModule';
import UserManagementModule from './UserManagementModule';
import SystemLogsModule from './SystemLogsModule';
import RegistryModule from './RegistryModule';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
import { FaUsers, FaFileAlt, FaCog, FaNetworkWired, FaChartLine, FaTicketAlt, FaRobot, FaShieldAlt, FaUserShield, FaClipboardList, FaDatabase } from 'react-icons/fa';

// Styling
import '../../Layout.css';
import '../../theme.css';

// Helpers
import { generateBotInviteUrl } from '../../services/user';
import { fetchGuildChannels } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';

const BOT_PERMISSIONS = '8';
const BOT_SCOPES = 'bot%20applications.commands';

// Mock data for admin users
// const mockAdminUsers = [
//   { id: 'u1', name: 'Admin Alpha', email: 'alpha@qft.com', clearance: 'Level 5', status: 'Active' },
//   { id: 'u2', name: 'Moderator Beta', email: 'beta@qft.com', clearance: 'Level 3', status: 'Active' },
//   { id: 'u3', name: 'Guest Gamma', email: 'gamma@qft.com', clearance: 'Level 1', status: 'Inactive' },
// ];

// // Mock log data
// const mockLogs = [
//   { id: 'l1', timestamp: '2025-12-12 10:00:00', type: 'INFO', message: 'User Alpha logged in.' },
//   { id: 'l2', timestamp: '2025-12-12 10:05:30', type: 'WARN', message: 'API rate limit warning on Discord integration.' },
//   { id: 'l3', timestamp: '2025-12-12 10:15:00', type: 'ERROR', message: 'Failed to push update to QFT Agent.' },
//   { id: 'l4', timestamp: '2025-12-12 10:30:15', type: 'INFO', message: 'System health check passed.' },
// ];

function AdminDashboardContent() {
  const {
    userStatus,
    userGuilds,
    discordClientId,
    isLoadingUser,
    setUserGuilds,
    qftRole, // Get qftRole from context
  } = useUser();

  const [adminUsers, setAdminUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platformIntegrationEnabled, setPlatformIntegrationEnabled] = useState(true);
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState('users');

  // State for Discord Guild Channels section
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(null);

  // Define roles that can see the BotControlModule and Discord Channels
  const allowedBotControlRoles = ['alpha_owner', 'omega_executive', 'level_3_management'];
  let hasBotControlAccess = false;
  if (qftRole && typeof qftRole === 'string') {
    hasBotControlAccess = allowedBotControlRoles.includes(qftRole);
  }

  useEffect(() => {
    if (userStatus && userGuilds.length > 0 && !selectedGuildId) {
      // Automatically select the first mutual guild if none is selected
      setSelectedGuildId(userGuilds[0].id);
    }
  }, [userStatus, userGuilds, selectedGuildId]);

  useEffect(() => {
    const getChannels = async () => {
      if (!selectedGuildId || !userStatus) {
        setChannels([]);
        return;
      }

      setChannelsLoading(true);
      setChannelsError(null);
      try {
        const token = localStorage.getItem('qft-token');
        if (!token) {
          setChannelsError(new Error("Authentication token not found."));
          setChannelsLoading(false);
          return;
        }
        const result = await fetchGuildChannels(selectedGuildId, token);
        if (result.success) {
          setChannels(result.data);
        } else {
          setChannelsError(new Error(result.message));
        }
      } catch (err) {
        setChannelsError(err);
      } finally {
        setChannelsLoading(false);
      }
    };

    if (hasBotControlAccess) { // Only fetch channels if user has access
        getChannels();
    }
  }, [selectedGuildId, userStatus, hasBotControlAccess]);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('qft-token');
      if (!token) {
        setError(new Error("Authentication token not found."));
        setIsLoading(false);
        return;
      }

      try {
        const [usersResponse, logsResponse] = await Promise.all([
          fetch('http://localhost:3001/api/v1/admin/users', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:3001/api/v1/admin/logs', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!usersResponse.ok || !logsResponse.ok) {
          throw new Error('Failed to fetch admin data');
        }

        const users = await usersResponse.json();
        const logs = await logsResponse.json();

        setAdminUsers(users);
        setLogs(logs);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const inviteUrl = generateBotInviteUrl(discordClientId, BOT_SCOPES, BOT_PERMISSIONS);

  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  // Functions for admin controls (placeholders)
  const handleChangeClearance = async (userId, newClearance) => {
    await showAlert(`Changing clearance for ${userId} to ${newClearance}`);
    // In a real app, this would dispatch an API call
    setAdminUsers(prevUsers => prevUsers.map(user =>
      user.id === userId ? { ...user, clearance: newClearance } : user
    ));
  };

  const handleToggleUserStatus = async (userId) => {
    await showAlert(`Toggling status for ${userId}`);
    // In a real app, this would dispatch an API call
    setAdminUsers(prevUsers => prevUsers.map(user =>
      user.id === userId ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' } : user
    ));
  };


  const adminSections = [
    { id: 'users', label: 'User Management', icon: FaUserShield },
    { id: 'permissions', label: 'Roles & Permissions', icon: FaShieldAlt },
    { id: 'logs', label: 'System Logs', icon: FaClipboardList },
    { id: 'registry', label: 'Registry', icon: FaDatabase },
    { id: 'settings', label: 'Admin Settings', icon: FaCog },
    { id: 'orchestration', label: 'Platform Orchestration', icon: FaNetworkWired },
    { id: 'analytics', label: 'Analytics & Modules', icon: FaChartLine },
    { id: 'tools', label: 'Admin Tools', icon: FaRobot },
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagementModule />;
      case 'permissions':
        return <PermissionsModule />;
      case 'logs':
        return <SystemLogsModule />;
      case 'registry':
        return <RegistryModule />;
      case 'oldsettings': // Keep old users section as backup
        return (
          <div className="qft-card admin-section">
          <h2>User Clearance & Management</h2>
          <p className="section-description">Manage user roles, permissions, and access levels across the QFT Ecosystem.</p>
          <div className="user-list">
            {isLoading && <p>Loading users...</p>}
            {error && <p className="error-message">Error loading users: {error.message}</p>}
            {!isLoading && !error && adminUsers.map(user => (
              <div key={user.id} className="user-item">
                <div>
                  <strong>{user.name}</strong> ({user.email})<br />
                  Clearance: {user.clearance} | Status: <span className={user.status === 'Active' ? 'type-INFO' : 'type-ERROR'}>{user.status}</span>
                </div>
                <div className="user-actions">
                  <select
                    value={user.clearance}
                    onChange={(e) => handleChangeClearance(user.id, e.target.value)}
                    className="qft-select"
                  >
                    <option value="Level 1">Level 1 (Guest)</option>
                    <option value="Level 3">Level 3 (Moderator)</option>
                    <option value="Level 5">Level 5 (Admin)</option>
                  </select>
                  <button onClick={() => handleToggleUserStatus(user.id)} className="qft-button">
                    {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {/* Future: Edit full profile, Reset Password, etc. */}
                </div>
              </div>
            ))}
          </div>
          {/* Future: Add new user, search users, bulk actions */}
          <button className="qft-button primary" style={{ marginTop: '15px' }}>Add New User</button>
        </div>
        );
      case 'logs':
        return (
          <div className="qft-card admin-section">
          <h2>System Logs</h2>
          <p className="section-description">Monitor recent system activities, warnings, and errors.</p>
          <div className="logs-container">
            {isLoading && <p>Loading logs...</p>}
            {error && <p className="error-message">Error loading logs: {error.message}</p>}
            {!isLoading && !error && logs.map(log => (
              <div key={log.id} className="log-item">
                <small className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</small>
                <span className={`log-type type-${log.type}`}>[{log.type}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
          {/* Future: Filter logs, download logs, real-time log streaming */}
          <button className="qft-button" style={{ marginTop: '15px' }}>View Full Log Archive</button>
        </div>
        );
      case 'settings':
        return (
          <div className="qft-card admin-section">
          <h2>Admin Settings</h2>
          <p className="section-description">Global configurations and operational toggles for the QFT Ecosystem.</p>
          <div className="setting-item">
            <span>Platform Integrations (e.g., Discord, Twitch APIs)</span>
            <Switch
              checked={platformIntegrationEnabled}
              onChange={() => setPlatformIntegrationEnabled(!platformIntegrationEnabled)}
              ariaLabel="Toggle Platform Integrations"
            />
          </div>
          <div className="setting-item">
            <span>Debug Mode</span>
            <Switch
              checked={debugModeEnabled}
              onChange={() => setDebugModeEnabled(!debugModeEnabled)}
              ariaLabel="Toggle Debug Mode"
            />
          </div>
          {/* Future: Cache clearing, Feature Flag management, API key management */}
          <button className="qft-button primary" style={{ marginTop: '15px' }}>Save Admin Settings</button>
        </div>
        );
      case 'orchestration':
        return (
          <div className="qft-card admin-section">
          <h2>Multi-Platform Orchestration</h2>
          <p className="section-description">Centralized control and monitoring for all connected platforms and QFT Agent instances.</p>
          <ul>
            <li><strong>Discord Bot Status:</strong> Monitor bot uptime, command usage, and server connectivity.</li>
            <li><strong>Agent Deployment:</strong> Manage and deploy QFT Agent updates across various environments.</li>
            <li><strong>Cross-Platform Sync:</strong> Configure and troubleshoot data synchronization between platforms.</li>
          </ul>
          {/* Future: Dashboards for each platform, deployment pipelines, health checks */}
          <button className="qft-button" style={{ marginTop: '15px' }}>View Orchestration Dashboard</button>
        </div>
        );
      case 'analytics':
        return (
          <>
            <h2 className="admin-dashboard-title">General Dashboard Modules</h2>
            <p className="section-description">These modules provide an overview, accessible to admins as well as other authorized personnel.</p>
            <ProfileModule user={userStatus} />
            <OrdersModule user={userStatus} />
            {hasBotControlAccess && (
              <BotControlModule
                userGuilds={userGuilds}
                setUserGuilds={setUserGuilds}
                inviteUrl={inviteUrl}
              />
            )}
            <PortalModule user={userStatus} />
            {userStatus?.isStaff && <AnalyticsModule user={userStatus} />}
          </>
        );
      case 'tools':
        return (
          <div className="admin-tools" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TicketDashboard />
            {hasBotControlAccess && <WorkerBuilder />}
            <EmbedBuilderModule />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bot-management-page">
        <div className="bot-management-header">
          <h1>Admin Control Panel</h1>
          <p>Manage users, system settings, and platform orchestration</p>
        </div>

        <div className="bot-management-layout">
          <aside className="bot-management-sidebar">
            <nav className="bot-modules-nav">
              {adminSections.map(section => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.id}
                    className={`module-nav-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="module-icon"><IconComponent /></span>
                    <span className="module-label">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="bot-management-content">
            {renderActiveSection()}
          </main>
        </div>
      </div>
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
      {/* Note: A proper implementation might involve creating separate admin-specific modules for clarity */}
    </>
  );
}

export default AdminDashboardContent;