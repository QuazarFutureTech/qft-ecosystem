import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProfileModule from './ProfileModule';
import OrdersModule from './OrdersModule';
import BotControlModule from './BotControlModule';
import PortalModule from './PortalModule';
import AnalyticsModule from './AnalyticsModule';
import TicketDashboard from './TicketDashboard';
import EmbedBuilderModule from './EmbedBuilderModule';
import WorkerBuilder from './WorkerBuilder';
import PermissionsModule from './PermissionsModule';
import UsersSection from '../../pages/Users.jsx';
import ControlPanelModulesGrid from './ControlPanelModulesGrid.jsx';
import ModuleManagerModule from './ModuleManagerModule';
import SystemLogsModule from './SystemLogsModule';
import RegistryModule from './RegistryModule';
import DatabaseManagerModule from './DatabaseManagerModule';
import BotManagementSection from './BotManagementSection';
import AdaptiveNavigation from './AdaptiveNavigation';
import Breadcrumbs from '../elements/Breadcrumbs';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
// FaBars is removed from here as it's now managed by parent ControlPanel.jsx
import { isPrivilegedStaff, getClearanceLabel } from '../../utils/clearance';
import { buildControlPanelBreadcrumbs } from '../../utils/routeMap';
import { determineNavContext, NAV_CONTEXT, getActiveItemLabel } from '../../utils/navigationController';

// Styling
import '../../Layout.css';
import '../../theme.css';

// Helpers
import { generateBotInviteUrl } from '../../services/user';
import { fetchGuildChannels } from '../../services/admin';
import { useUser } from '../../contexts/UserContext.jsx';

const BOT_PERMISSIONS = '8';
const BOT_SCOPES = 'bot%20applications.commands';

function ControlPanelContent({ sidebarOpen, setSidebarOpen, setHeaderContentForControlPanel, toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    userStatus,
    userGuilds,
    discordClientId,
    isLoadingUser,
    setUserGuilds,
    qftRole, // Get qftRole from context
  } = useUser();

  const [activeSection, setActiveSection] = useState('modules');
  const [activeModule, setActiveModule] = useState('commands'); // Track active bot module
  const [selectedUserId, setSelectedUserId] = useState(null); // For Users section
  
  // Wrapper function to update both state and URL when section changes
  const handleSectionChange = (newSection) => {
    // Special handling for ai-modules - navigate to dedicated route
    if (newSection === 'ai-modules') {
      navigate('/control-panel/ai-modules');
      return;
    }

    setActiveSection(newSection);
    setActiveModule('commands'); // Reset module when section changes
    setSelectedUserId(null); // Reset selected user when section changes

    const sectionRoutes = {
      users: '/control-panel/users',
      permissions: '/control-panel/permissions',
      'bot-control': '/control-panel?section=bot-control',
      logs: '/control-panel?section=logs',
      registry: '/control-panel?section=registry',
      'module-manager': '/control-panel?section=module-manager',
      database: '/control-panel?section=database',
      analytics: '/control-panel?section=analytics',
      tools: '/control-panel?section=tools'
    };

    const target = sectionRoutes[newSection] || `/control-panel?section=${newSection}`;
    navigate(target);
  };
  
  // Wrapper function to update both state and URL when module changes
  const handleModuleChange = (newModule) => {
    setActiveModule(newModule);
    // Module changes don't change the URL, just update state
  };
  
  // Listen to route changes from breadcrumb clicks and update navigation context
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionFromUrl = params.get('section');
    const pathSection = location.pathname.startsWith('/control-panel/')
      ? location.pathname.split('/')[2]
      : null;

    // If exactly /control-panel, always show grid
    if (location.pathname === '/control-panel') {
      setActiveSection('modules');
      setActiveModule('commands');
      setSelectedUserId(null);
      return;
    }

    let derivedSection = pathSection || sectionFromUrl;
    if (!derivedSection || derivedSection === '') {
      derivedSection = 'modules';
    }
    // Extract userId if present
    const pathParts = location.pathname.split('/');
    let userId = null;
    if (pathParts.length > 3 && pathParts[2] === 'users') {
      userId = pathParts[3];
    }
    setActiveSection(derivedSection);
    setActiveModule('commands');
    setSelectedUserId(userId);
  }, [location.search, location.pathname, navigate]);
  
  // State for Discord Guild Channels section
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState(null);

  // Define privileged staff access using new clearance system
  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);
  const hasBotControlAccess = hasPrivilegedAccess; // All privileged staff can access bot controls
  
  // Check access on mount
  useEffect(() => {
    if (!hasPrivilegedAccess) {
      // Redirect or show error for non-privileged users
      console.warn('User does not have privileged access to Control Panel');
    }
  }, [hasPrivilegedAccess]);

  useEffect(() => {
    if (userStatus && userGuilds.length > 0 && !selectedGuildId) {
      // Automatically select the first mutual guild if none is selected
      setSelectedGuildId(userGuilds[0].id);
    }
  }, [userStatus, userGuilds, selectedGuildId, setSelectedGuildId]);

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



  const inviteUrl = generateBotInviteUrl(discordClientId, BOT_SCOPES, BOT_PERMISSIONS);

  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  // Determine current breadcrumbs based on active section and module
  // Breadcrumbs include full navigation paths and reset context when clicked
  const breadcrumbItems = useMemo(() => {
    const navContext = determineNavContext(activeSection);
    if (activeSection === 'modules') {
      return [
        { label: 'Control Panel', path: '/control-panel', onClick: () => {
            setActiveSection('modules');
            setSelectedUserId(null);
            setSidebarOpen(false);
            navigate('/control-panel');
          }
        }
      ];
    }
    if (navContext === NAV_CONTEXT.BOT_CONTROL_MODULES) {
      // Bot Control context - show module in breadcrumbs
      const moduleLabel = getActiveItemLabel(navContext, activeModule);
      return [
        { label: 'Control Panel', path: '/control-panel', onClick: () => {
            setActiveSection('modules');
            setSelectedUserId(null);
            setSidebarOpen(false);
            navigate('/control-panel');
          }
        },
        { label: 'Bot Control', path: '/control-panel?section=bot-control' },
        { label: moduleLabel, path: null } // Current module, non-clickable
      ];
    }
    // Control Panel root context
    const sectionLabel = getActiveItemLabel(NAV_CONTEXT.CONTROL_PANEL_ROOT, activeSection);
    const sectionPath = activeSection === 'users'
      ? '/control-panel/users'
      : activeSection === 'permissions'
        ? '/control-panel/permissions'
        : `/control-panel?section=${activeSection}`;
    return [
      { label: 'Control Panel', path: '/control-panel', onClick: () => {
          setActiveSection('modules');
          setSelectedUserId(null);
          setSidebarOpen(false);
          navigate('/control-panel');
        }
      },
      { label: sectionLabel || activeSection, path: null } // Current section, non-clickable
    ];
  }, [activeSection, activeModule, navigate, setSidebarOpen]);

  useEffect(() => {
    setHeaderContentForControlPanel({
      title: 'Control Panel',
      subtitle: 'System administration for privileged staff - Manage users, permissions, and platform settings',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
      actions: (
        <>
          <div className="clearance-badge" style={{ marginTop: '10px' }}>
            <span>Your Clearance: <strong>{getClearanceLabel(qftRole)}</strong></span>
          </div>
        </>
      ),
    });

    return () => setHeaderContentForControlPanel(null);
  }, [setHeaderContentForControlPanel, breadcrumbItems, qftRole]);

  // Render sidebar for Users section
  const renderSidebar = () => {
    // For 'users' section, sidebar is handled inside UsersSection
    if (activeSection === 'users') {
      return null;
    }
    // Always show sidebar (AdaptiveNavigation) for modules grid and other sections
    return (
      <AdaptiveNavigation
        activeSection={activeSection}
        activeModule={activeModule}
        onSectionChange={handleSectionChange}
        onModuleChange={handleModuleChange}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={setSidebarOpen} // Directly pass setSidebarOpen
      />
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'modules':
        return <ControlPanelModulesGrid />;
      case 'users':
        // Render UsersSection as a top-level page, not nested in Control Panel layout
        return <UsersSection userId={selectedUserId} onUserSelect={setSelectedUserId} />;
      case 'permissions':
        return <PermissionsModule />;
      case 'bot-control':
        return hasBotControlAccess ? <BotManagementSection /> : (
          <div className="qft-card">
            <h2>Access Denied</h2>
            <p>You need elevated permissions to access Bot Control.</p>
          </div>
        );
      case 'logs':
        return <SystemLogsModule />;
      case 'registry':
        return <RegistryModule />;
      case 'module-manager':
        return <ModuleManagerModule />;
      case 'database':
        return <DatabaseManagerModule />;
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

  // If users section, render as top-level (not nested in Control Panel layout)
  if (activeSection === 'users') {
    return renderActiveSection();
  }
  return (
    <>
      <div className="page-wrapper">
        {/* Sidebar Overlay */}
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className="page-layout">
          {renderSidebar()}
          <main className="page-content">
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

export default ControlPanelContent;