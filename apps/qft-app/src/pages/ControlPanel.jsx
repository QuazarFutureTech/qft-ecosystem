import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import ProfileModule from '../components/modules/ProfileModule';
import OrdersModule from '../components/modules/OrdersModule';
import BotControlModule from '../components/modules/BotControlModule';
import PortalModule from '../components/modules/PortalModule';
import AnalyticsModule from '../components/modules/AnalyticsModule';
import TicketDashboard from '../components/modules/TicketDashboard';
import EmbedBuilderModule from '../components/modules/EmbedBuilderModule';
import WorkerBuilder from '../components/modules/WorkerBuilder';
import PermissionsModule from '../components/modules/PermissionsModule';
import UsersSection from './Users.jsx';
import ControlPanelModulesGrid from '../components/modules/ControlPanelModulesGrid.jsx';
import ModuleManagerModule from '../components/modules/ModuleManagerModule';
import SystemLogsModule from '../components/modules/SystemLogsModule';
import RegistryModule from '../components/modules/RegistryModule';
import DatabaseManagerModule from '../components/modules/DatabaseManagerModule';
import BotManagementSection from '../components/modules/BotManagementSection';
import AdaptiveNavigation from '../components/modules/AdaptiveNavigation';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { useModal } from '../hooks/useModal';
import ConfirmModal from '../components/elements/ConfirmModal';
import { isPrivilegedStaff, getClearanceLabel } from '../utils/clearance';
import { determineNavContext, NAV_CONTEXT, getActiveItemLabel } from '../utils/navigationController';
import { generateBotInviteUrl } from '../services/user';
import { fetchGuildChannels } from '../services/admin';

const BOT_PERMISSIONS = '8';
const BOT_SCOPES = 'bot%20applications.commands';

function ControlPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userStatus, userGuilds, discordClientId, qftRole } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();

  const [activeSection, setActiveSection] = useState('modules');
  const [activeModule, setActiveModule] = useState('commands');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const handleSectionChange = useCallback((newSection) => {
    if (newSection === 'ai-modules') {
      navigate('/control-panel/ai-modules');
      return;
    }
    setActiveSection(newSection);
    setActiveModule('commands');
    setSelectedUserId(null);
    const target = newSection === 'modules' ? '/control-panel' : `/control-panel/${newSection}`;
    navigate(target);
    closeSmartNav();
  }, [navigate, closeSmartNav]);

  const handleModuleChange = useCallback((newModule) => {
    setActiveModule(newModule);
    closeSmartNav();
  }, [closeSmartNav]);
  
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(p => p);
    const section = pathParts[1] || 'modules';
    const userId = pathParts[2] || null;
~
    setActiveSection(section);
    setSelectedUserId(userId);
  }, [location.pathname]);
  
  const hasPrivilegedAccess = isPrivilegedStaff(qftRole);

  const goToModules = useCallback(() => {
    handleSectionChange('modules');
  }, [handleSectionChange]);

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Control Panel', path: '/control-panel', onClick: goToModules }];
    if (activeSection !== 'modules') {
      const sectionLabel = getActiveItemLabel(NAV_CONTEXT.CONTROL_PANEL_ROOT, activeSection);
      items.push({ label: sectionLabel || activeSection, path: null });
    }
    return items;
  }, [activeSection, goToModules]);

  useEffect(() => {
    setHeaderContent({
      title: 'Control Panel',
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
    });
    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems]);

  useEffect(() => {
    setSmartNavContent(
      <AdaptiveNavigation
        activeSection={activeSection}
        activeModule={activeModule}
        onSectionChange={handleSectionChange}
        onModuleChange={handleModuleChange}
        onCloseSidebar={closeSmartNav}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, activeSection, activeModule, closeSmartNav, handleSectionChange, handleModuleChange]);


  const renderActiveSection = () => {
    if (!hasPrivilegedAccess) {
        return (
            <div className="qft-card">
                <h2>Access Denied</h2>
                <p>You do not have the required clearance to access the Control Panel.</p>
            </div>
        );
    }

    switch (activeSection) {
      case 'modules':
        return <ControlPanelModulesGrid onModuleClick={handleSectionChange} />;
      case 'users':
        return <UsersSection userId={selectedUserId} onUserSelect={setSelectedUserId} />;
      case 'permissions':
        return <PermissionsModule />;
      case 'bot-control':
        return <BotManagementSection />;
      case 'logs':
        return <SystemLogsModule />;
      case 'registry':
        return <RegistryModule />;
      case 'module-manager':
        return <ModuleManagerModule />;
      case 'database':
        return <DatabaseManagerModule />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'tools':
        return (
          <div className="admin-tools" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TicketDashboard />
            <WorkerBuilder />
            <EmbedBuilderModule />
          </div>
        );
      default:
        return <ControlPanelModulesGrid onModuleClick={handleSectionChange} />;
    }
  };

  return (
    <>
      {renderActiveSection()}
    </>
  );
}

export default ControlPanel;
