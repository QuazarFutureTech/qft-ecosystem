import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ModuleGrid from '../components/modules/ai-modules/ModuleGrid';
import ModuleDetailView from '../components/modules/ai-modules/ModuleDetailView';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { useUser } from '../contexts/UserContext';
import { useHeader } from '../contexts/HeaderContext.jsx';
import { useSmartNav } from '../contexts/SmartNavContext.jsx';
import { useSelectedGuild } from '../contexts/SelectedGuildContext';
import { isPrivilegedStaff, getClearanceLabel } from '../utils/clearance';
import { AI_MODULES_CONTEXT } from '../utils/aiModulesConstants.js';
import AiModulesSmartNav from './AiModulesSmartNav.jsx';
import '../Layout.css';

function AiModules() {
  const { platform, module } = useParams();
  const navigate = useNavigate();
  const { qftRole, userGuilds } = useUser();
  const { setHeaderContent } = useHeader();
  const { setSmartNavContent, closeSmartNav } = useSmartNav();
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();

  const currentContext = !platform 
    ? AI_MODULES_CONTEXT.PLATFORM_SELECTOR 
    : module 
      ? AI_MODULES_CONTEXT.MODULE_DETAIL 
      : AI_MODULES_CONTEXT.MODULE_GRID;

  const hasAccess = isPrivilegedStaff(qftRole);

  const handlePlatformSelect = useCallback((platformId) => {
    navigate(`/control-panel/ai-modules/${platformId}`);
  }, [navigate]);

  const handleModuleSelect = useCallback((platformId, moduleId) => {
    navigate(`/control-panel/ai-modules/${platformId}/${moduleId}`);
  }, [navigate]);

  const breadcrumbItems = React.useMemo(() => {
    const items = [
      { label: 'Control Panel', path: '/control-panel' },
      { label: 'Ai Modules', path: '/control-panel/ai-modules' }
    ];
    if (platform) {
      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
      items.push({ 
        label: platformLabel, 
        path: `/control-panel/ai-modules/${platform}` 
      });
      if (module) {
        const moduleLabel = module.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        items.push({ label: moduleLabel, path: null });
      }
    }
    return items;
  }, [platform, module]);

  useEffect(() => {
    if (!hasAccess) {
      setHeaderContent({
        title: 'Access Denied',
        subtitle: 'You need elevated permissions to access Ai Modules.',
      });
    } else {
      setHeaderContent({
        title: 'Ai Modules',
        subtitle: 
          currentContext === AI_MODULES_CONTEXT.PLATFORM_SELECTOR ? 'Platform-first AI integration management' :
          currentContext === AI_MODULES_CONTEXT.MODULE_GRID ? `Configure ${platform.charAt(0).toUpperCase() + platform.slice(1)} modules` :
          'Module configuration panel',
        breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
        actions: (
          <>
            <div className="clearance-badge" style={{ marginTop: '10px' }}>
              <span>Your Clearance: <strong>{getClearanceLabel(qftRole)}</strong></span>
            </div>
            {platform === 'discord' && userGuilds && userGuilds.length > 0 && (
              <div className="header-actions">
                <div className="guild-selector-header">
                  <label>Server:</label>
                  <select
                    value={selectedGuildId || ''}
                    onChange={(e) => setSelectedGuildId(e.target.value)}
                    className="qft-select"
                  >
                    {userGuilds.map(guild => (
                      <option key={guild.id} value={guild.id}>
                        {guild.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </>
        ),
      });
    }
    return () => setHeaderContent(null);
  }, [setHeaderContent, hasAccess, currentContext, platform, breadcrumbItems, qftRole, userGuilds, selectedGuildId, setSelectedGuildId]);

  useEffect(() => {
    setSmartNavContent(
      <AiModulesSmartNav
        currentContext={currentContext}
        platform={platform}
        module={module}
        onPlatformSelect={handlePlatformSelect}
        onModuleSelect={handleModuleSelect}
        onClose={closeSmartNav}
      />
    );
    return () => setSmartNavContent(null);
  }, [setSmartNavContent, currentContext, platform, module, closeSmartNav, handlePlatformSelect, handleModuleSelect]);


  if (!hasAccess) {
    return <div className="qft-card"><p>You need elevated permissions to access Ai Modules.</p></div>;
  }

  const renderContent = () => {
    switch (currentContext) {
      case AI_MODULES_CONTEXT.PLATFORM_SELECTOR:
        return (
            <div className="qft-card">
              <h2>Select a Platform</h2>
              <p>Choose a platform to manage its AI modules and integrations.</p>
            </div>
        );
      case AI_MODULES_CONTEXT.MODULE_GRID:
        return <ModuleGrid platform={platform} onModuleSelect={(moduleId) => handleModuleSelect(platform, moduleId)} />;
      case AI_MODULES_CONTEXT.MODULE_DETAIL:
        return <ModuleDetailView platform={platform} module={module} />;
      default:
        return <div>Invalid route</div>;
    }
  };

  return (
    <>
      {renderContent()}
    </>
  );
}

export default AiModules;
