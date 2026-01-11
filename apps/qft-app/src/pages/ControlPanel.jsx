import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import PermissionsModule from '../components/modules/PermissionsModule';
import UsersSection from './Users.jsx';
import ControlPanelModulesGrid from '../components/modules/ControlPanelModulesGrid.jsx';
import SystemLogsModule from '../components/modules/SystemLogsModule';
import RegistryModule from '../components/modules/RegistryModule';
import DatabaseManagerModule from '../components/modules/DatabaseManagerModule';
import AdaptiveNavigation from '../components/modules/AdaptiveNavigation';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { isPrivilegedStaff } from '../utils/clearance';
import { NAV_CONTEXT, getActiveItemLabel } from '../utils/navigationController';

function ControlPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userStatus, userGuilds, discordClientId, qftRole } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();

  const [activeSection, setActiveSection] = useState('modules');
  const [activeModule, setActiveModule] = useState('commands');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const allowedSections = useMemo(() => (
    ['modules', 'users', 'permissions', 'registry', 'logs', 'database', 'ai-modules']
  ), []);

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
    setActiveSection(allowedSections.includes(section) ? section : 'modules');
    setSelectedUserId(userId);
  }, [location.pathname, allowedSections]);
  
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
      case 'logs':
        return <SystemLogsModule />;
      case 'registry':
        return <RegistryModule />;
      case 'database':
        return <DatabaseManagerModule />;
      default:
        return <ControlPanelModulesGrid onModuleClick={handleSectionChange} />;
    }
}

  return (
    <>
      {renderActiveSection()}
    </>
  );
}

export default ControlPanel;
