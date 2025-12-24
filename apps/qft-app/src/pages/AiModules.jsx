import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import PlatformSelector from '../components/modules/ai-modules/PlatformSelector';
import ModuleGrid from '../components/modules/ai-modules/ModuleGrid';
import ModuleList from '../components/modules/ai-modules/ModuleList';
import ModuleDetailView from '../components/modules/ai-modules/ModuleDetailView';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import { FaBars } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
import { useSelectedGuild } from '../contexts/SelectedGuildContext';
import { isPrivilegedStaff, getClearanceLabel } from '../utils/clearance';
import '../Layout.css';

// Navigation contexts for Ai Modules
export const AI_MODULES_CONTEXT = {
  PLATFORM_SELECTOR: 'platform-selector',
  MODULE_GRID: 'module-grid',
  MODULE_DETAIL: 'module-detail'
};

function AiModules() {
  const { platform, module } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { qftRole, userGuilds } = useUser();
  const { setHeaderContent } = useHeader(); // Use setHeaderContent
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine current context based on route
  const currentContext = !platform 
    ? AI_MODULES_CONTEXT.PLATFORM_SELECTOR 
    : module 
      ? AI_MODULES_CONTEXT.MODULE_DETAIL 
      : AI_MODULES_CONTEXT.MODULE_GRID;

  // Check access
  const hasAccess = isPrivilegedStaff(qftRole);

  // Close sidebar on mobile
  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Build breadcrumbs based on current route
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
        const moduleLabel = module.split('-').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' ');
        items.push({ 
          label: moduleLabel, 
          path: null // Current page
        });
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
          currentContext === AI_MODULES_CONTEXT.MODULE_DETAIL ? 'Module configuration panel' : '',
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
            <button 
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>
          </>
        ),
      });
    }

    return () => setHeaderContent(null);
  }, [setHeaderContent, hasAccess, currentContext, platform, breadcrumbItems, qftRole, userGuilds, selectedGuildId, setSelectedGuildId, toggleSidebar]);

  // Access control
  if (!hasAccess) {
    return (
      <div className="page-wrapper">
        <div className="qft-card">
          <p>You need elevated permissions to access Ai Modules.</p>
        </div>
      </div>
    );
  }

  // Render appropriate sidebar based on context
  const renderSidebar = () => {
    switch (currentContext) {
      case AI_MODULES_CONTEXT.PLATFORM_SELECTOR:
        return (
          <PlatformSelector
            sidebarOpen={sidebarOpen}
            onCloseSidebar={closeSidebar}
            onPlatformSelect={(platformId) => {
              navigate(`/control-panel/ai-modules/${platformId}`);
              closeSidebar();
            }}
          />
        );
      
      case AI_MODULES_CONTEXT.MODULE_GRID:
      case AI_MODULES_CONTEXT.MODULE_DETAIL:
        return (
          <ModuleList
            platform={platform}
            activeModule={module}
            sidebarOpen={sidebarOpen}
            onCloseSidebar={closeSidebar}
            onModuleSelect={(moduleId) => {
              navigate(`/control-panel/ai-modules/${platform}/${moduleId}`);
              closeSidebar();
            }}
          />
        );
      
      default:
        return null;
    }
  };

  // Render main content based on context
  const renderContent = () => {
    switch (currentContext) {
      case AI_MODULES_CONTEXT.PLATFORM_SELECTOR:
        return (
          <div className="page-content">
            <div className="qft-card">
              <h2>Select a Platform</h2>
              <p>Choose a platform from the sidebar to manage its AI modules and integrations.</p>
              <div style={{ marginTop: '20px', padding: '20px', background: 'var(--color-background-secondary)', borderRadius: '8px' }}>
                <h3>Available Platforms:</h3>
                <ul style={{ marginTop: '10px', lineHeight: '1.8' }}>
                  <li><strong>Discord</strong> — Fully functional with custom commands, automod, embeds, and more</li>
                  <li><strong>Reddit</strong> — Coming soon</li>
                  <li><strong>YouTube</strong> — Coming soon</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case AI_MODULES_CONTEXT.MODULE_GRID:
        return (
          <ModuleGrid 
            platform={platform}
            onModuleSelect={(moduleId) => {
              navigate(`/control-panel/ai-modules/${platform}/${moduleId}`);
            }}
          />
        );

      case AI_MODULES_CONTEXT.MODULE_DETAIL:
        return (
          <ModuleDetailView 
            platform={platform}
            module={module}
          />
        );

      default:
        return <div className="page-content">Invalid route</div>;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="page-layout">
        {renderSidebar()}
        {renderContent()}
      </div>
    </div>
  );
}

export default AiModules;
