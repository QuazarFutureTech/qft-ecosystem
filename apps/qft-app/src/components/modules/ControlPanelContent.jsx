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
import UserManagementModule from './UserManagementModule';
import ModuleManagerModule from './ModuleManagerModule';
import SystemLogsModule from './SystemLogsModule';
import RegistryModule from './RegistryModule';
import DatabaseManagerModule from './DatabaseManagerModule';
import BotManagementSection from './BotManagementSection';
import AdaptiveNavigation from './AdaptiveNavigation';
import Breadcrumbs from '../elements/Breadcrumbs';
import { useModal } from '../../hooks/useModal';
import ConfirmModal from '../elements/ConfirmModal';
import { FaBars } from 'react-icons/fa';
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

function ControlPanelContent({ sidebarOpen, setSidebarOpen }) {
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

  const [activeSection, setActiveSection] = useState('users');
  const [activeModule, setActiveModule] = useState('commands'); // Track active bot module
  
  // Wrapper function to update both state and URL when section changes
  const handleSectionChange = (newSection) => {
    // Special handling for ai-modules - navigate to dedicated route
    if (newSection === 'ai-modules') {
      navigate('/control-panel/ai-modules');
      return;
    }
    
    setActiveSection(newSection);
    setActiveModule('commands'); // Reset module when section changes
    
    // Update URL to reflect section change
    if (newSection === 'users') {
      navigate('/control-panel');
    } else {
      navigate(`/control-panel?section=${newSection}`);
    }
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
    
    if (sectionFromUrl) {
      // If there's a section parameter, set it as active
      setActiveSection(sectionFromUrl);
      // When section changes via breadcrumb, reset module to default
      setActiveModule('commands');
    } else {
      // No section parameter means we're at /control-panel root, show 'users' section
      setActiveSection('users');
      setActiveModule('commands');
    }
  }, [location.search, location.pathname]);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

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



  const inviteUrl = generateBotInviteUrl(discordClientId, BOT_SCOPES, BOT_PERMISSIONS);

  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  // Determine current breadcrumbs based on active section and module
  // Breadcrumbs include full navigation paths and reset context when clicked
  const breadcrumbItems = useMemo(() => {
    const navContext = determineNavContext(activeSection);
    
    if (navContext === NAV_CONTEXT.BOT_CONTROL_MODULES) {
      // Bot Control context - show module in breadcrumbs
      const moduleLabel = getActiveItemLabel(navContext, activeModule);
      return [
        { label: 'Control Panel', path: '/control-panel' },
        { label: 'Bot Control', path: '/control-panel?section=bot-control' },
        { label: moduleLabel, path: null } // Current module, non-clickable
      ];
    }
    
    // Control Panel root context
    const sectionLabel = getActiveItemLabel(NAV_CONTEXT.CONTROL_PANEL_ROOT, activeSection);
    const sectionPath = activeSection === 'users' 
      ? '/control-panel' 
      : `/control-panel?section=${activeSection}`;
    
    return [
      { label: 'Control Panel', path: '/control-panel' },
      { label: sectionLabel || activeSection, path: null } // Current section, non-clickable
    ];
  }, [activeSection, activeModule]);

  


  const renderActiveSection = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagementModule />;
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

  return (
    <>
      <div className="page-wrapper">
        <div className="page-header">
          
          <div>
            <h1>Control Panel</h1>
            <p>System administration for privileged staff - Manage users, permissions, and platform settings</p>
            <div className="clearance-badge" style={{ marginTop: '10px' }}>
              <span>Your Clearance: <strong>{getClearanceLabel(qftRole)}</strong></span>
            </div>
          </div>
          {/* Mobile Sidebar Toggle */}
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        
        {/* Sidebar Overlay */}
        <div 
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <div className="page-layout">
          <AdaptiveNavigation
            activeSection={activeSection}
            activeModule={activeModule}
            onSectionChange={handleSectionChange}
            onModuleChange={handleModuleChange}
            sidebarOpen={sidebarOpen}
            onCloseSidebar={closeSidebar}
          />

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