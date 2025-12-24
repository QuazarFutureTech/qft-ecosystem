// apps/qft-app/src/pages/BotManagement.jsx
// Dedicated page for bot configuration with larger, organized layout

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
import { useHeader } from '../contexts/HeaderContext.jsx'; // Import useHeader
import { useSelectedGuild } from '../contexts/SelectedGuildContext.jsx';
import QFTPreloader from '../components/QFTPreloader';
import CollapsibleCategory from '../components/elements/CollapsibleCategory';
import Breadcrumbs from '../components/elements/Breadcrumbs';
import CustomCommandBuilderModule from '../components/modules/CustomCommandBuilderModule';
import AutomodModule from '../components/modules/AutomodModule';
import WelcomeModule from '../components/modules/WelcomeModule';
import EnhancedEmbedBuilder from '../components/modules/EnhancedEmbedBuilder';
import CommandToggleModule from '../components/modules/CommandToggleModule';
import ScheduledEmbedsModule from '../components/modules/ScheduledEmbedsModule';
import AutomodRuleTesterModule from '../components/modules/AutomodRuleTesterModule';
import ModerationQuickActionsModule from '../components/modules/ModerationQuickActionsModule';
import RolePermissionManagerModule from '../components/modules/RolePermissionManagerModule';
import BackupsModule from '../components/modules/BackupsModule';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory, FaBars } from 'react-icons/fa';

function BotManagement() {
  const { isLoadingUser, qftRole, userGuilds, userStatus } = useUser();
  const { setHeaderContent } = useHeader(); // Use setHeaderContent
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [activeModule, setActiveModule] = useState('commands');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check for privileged staff access (α, Ω, 3, 2, 1)
  const hasAdminAccess = qftRole && ['α', 'Ω', '3', '2', '1'].includes(qftRole);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  if (isLoadingUser) {
    return <QFTPreloader />;
  }

  if (!hasAdminAccess) {
    return (
      <div className="page-content">
        <div className="qft-card">
          <h2>Bot Management</h2>
          <p>You need elevated permissions to manage bot settings.</p>
        </div>
      </div>
    );
  }

  const moduleCategories = [
    {
      title: 'Configuration',
      modules: [
        { id: 'commands', label: 'Custom Commands', icon: FaCode, component: CustomCommandBuilderModule },
        { id: 'welcome', label: 'Welcome Messages', icon: FaHandPaper, component: WelcomeModule },
        { id: 'embeds', label: 'Embeds', icon: FaEnvelope, component: EnhancedEmbedBuilder },
        { id: 'command-toggle', label: 'Command Toggle', icon: FaToggleOn, component: CommandToggleModule },
      ]
    },
    {
      title: 'Moderation',
      modules: [
        { id: 'automod', label: 'Auto Moderation', icon: FaShieldAlt, component: AutomodModule },
        { id: 'automod-tester', label: 'Automod Tester', icon: FaVial, component: AutomodRuleTesterModule },
        { id: 'quick-actions', label: 'Quick Actions', icon: FaGavel, component: ModerationQuickActionsModule },
        { id: 'role-permissions', label: 'Role Permissions', icon: FaUserShield, component: RolePermissionManagerModule },
      ]
    },
    {
      title: 'Automation',
      modules: [
        { id: 'scheduled-embeds', label: 'Scheduled Embeds', icon: FaClock, component: ScheduledEmbedsModule },
      ]
    },
    {
      title: 'Utilities',
      modules: [
        { id: 'backups', label: 'Server Backups', icon: FaHistory, component: BackupsModule },
      ]
    }
  ];

  // Flatten modules for lookup
  const allModules = moduleCategories.flatMap(cat => cat.modules);

  const ActiveComponent = allModules.find(m => m.id === activeModule)?.component;
  
  // Build breadcrumbs dynamically
  const breadcrumbItems = useMemo(() => {
    const currentModule = allModules.find(m => m.id === activeModule);
    return [
      { label: 'Bot Management', path: '/bot-management' },
      ...(currentModule ? [{ label: currentModule.label, path: null }] : [])
    ];
  }, [activeModule, allModules]);

  useEffect(() => {
    setHeaderContent({
      breadcrumbs: <Breadcrumbs items={breadcrumbItems} />,
      title: 'Bot Management',
      subtitle: 'Configure your Discord bot\'s behavior, commands, and automated features',
      actions: (
        <>
          {userGuilds && userGuilds.length > 0 && (
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

    return () => setHeaderContent(null);
  }, [setHeaderContent, breadcrumbItems, userGuilds, selectedGuildId, setSelectedGuildId, toggleSidebar]);
  
  

  return (
    <div className="page-wrapper">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => closeSidebar()}
      />

      <div className="page-layout">

        <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {moduleCategories.map((category, idx) => (
              <CollapsibleCategory 
                key={category.title} 
                title={category.title}
                defaultOpen={idx === 0}
              >
                {category.modules.map(module => {
                  const IconComponent = module.icon;
                  return (
                    <button
                      key={module.id}
                      className={`sidebar-nav-item ${activeModule === module.id ? 'active' : ''}`}
                      onClick={() => { setActiveModule(module.id); closeSidebar(); }}
                    >
                      <span className="nav-icon"><IconComponent /></span>
                      <span className="nav-label">{module.label}</span>
                    </button>
                  );
                })}
              </CollapsibleCategory>
            ))}
          </nav>
        </aside>

        <main className="page-content">
          {ActiveComponent && <ActiveComponent />}
        </main>
      </div>
    </div>
  );
}

export default BotManagement;

