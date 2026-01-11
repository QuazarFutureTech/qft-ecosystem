// BotManagementSection.jsx
// Bot configuration section for Control Panel

import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext.jsx';
import { useSelectedGuild } from '../../contexts/SelectedGuildContext.jsx';
import CollapsibleCategory from '../elements/CollapsibleCategory';
import CustomCommandBuilderModule from './CustomCommandBuilderModule';
import AutomodModule from './AutomodModule';
import WelcomeModule from './WelcomeModule';
import EnhancedEmbedBuilder from './EnhancedEmbedBuilder';
import ModerationQuickActionsModule from './ModerationQuickActionsModule';
import RolePermissionManagerModule from './RolePermissionManagerModule';
import BackupsModule from './BackupsModule';
import '../../assets/css/BotManagementSection.css';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory } from 'react-icons/fa';
import ModuleCard from '../elements/ModuleCard';
import { defaultModuleStates } from './moduleStates';


function BotManagementSection() {
  const { userGuilds } = useUser();
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [activeModule, setActiveModule] = useState('commands');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moduleStates, setModuleStates] = useState(defaultModuleStates);
  const [settingsModule, setSettingsModule] = useState(null);

  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleToggle = (moduleId) => {
    setModuleStates(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    // TODO: Call backend to persist state
  };

  const handleSettings = (moduleId) => {
    setSettingsModule(moduleId);
    // TODO: Open modal/drawer for module settings
  };

  const moduleCategories = [
    {
      title: 'Configuration',
      modules: [
        { id: 'commands', label: 'Custom Commands', icon: FaCode, component: CustomCommandBuilderModule },
        { id: 'welcome', label: 'Welcome Messages', icon: FaHandPaper, component: WelcomeModule },
        { id: 'embeds', label: 'Embeds', icon: FaEnvelope, component: EnhancedEmbedBuilder },
      ]
    },
    {
      title: 'Moderation',
      modules: [
        { id: 'automod', label: 'Auto Moderation', icon: FaShieldAlt, component: AutomodModule },
        { id: 'quick-actions', label: 'Quick Actions', icon: FaGavel, component: ModerationQuickActionsModule },
        { id: 'role-permissions', label: 'Role Permissions', icon: FaUserShield, component: RolePermissionManagerModule },
      ]
    },
    {
      title: 'Automation',
      modules: [
        // { id: 'scheduled-embeds', label: 'Scheduled Embeds', icon: FaClock, component: ScheduledEmbedsModule },
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

  return (
    <div className="bot-management-section">
      {/* Server Selector */}
      {userGuilds && userGuilds.length > 0 && (
        <div className="section-header-with-selector">
          <div>
            <h2>Bot Configuration</h2>
            <p>Configure your Discord bot's behavior, commands, and automated features</p>
          </div>
          <div className="guild-selector-inline">
            <label>Server:</label>
            {/* Debug output for userGuilds and selectedGuildId */}
            <pre style={{ fontSize: 10, color: '#888', margin: 0 }}>{JSON.stringify(userGuilds)}</pre>
            <pre style={{ fontSize: 10, color: '#888', margin: 0 }}>selectedGuildId: {String(selectedGuildId)}</pre>
            <select
              value={selectedGuildId || ''}
              onChange={(e) => setSelectedGuildId(e.target.value)}
              className="qft-select"
            >
              {userGuilds.map(guild => (
                <option key={guild.id} value={guild.id}>
                  {guild.name || '[No Name]'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Bot Module Categories */}
      <div className="bot-modules-grid">
        {moduleCategories.map((category, idx) => (
          <CollapsibleCategory 
            key={category.title} 
            title={category.title}
            defaultOpen={idx === 0}
          >
            <div className="module-buttons-grid">
              {category.modules.map(module => (
                <ModuleCard
                  key={module.id}
                  label={module.label}
                  icon={module.icon}
                  enabled={!!moduleStates[module.id]}
                  onToggle={() => handleToggle(module.id)}
                  onSettings={() => handleSettings(module.id)}
                  active={activeModule === module.id}
                  onClick={() => { setActiveModule(module.id); closeSidebar(); }}
                />
              ))}
            </div>
          </CollapsibleCategory>
        ))}
      </div>

      {/* Active Module Display */}
      {ActiveComponent && (
        <div className="active-module-container">
          <ActiveComponent />
        </div>
      )}
    </div>
  );
}

export default BotManagementSection;
