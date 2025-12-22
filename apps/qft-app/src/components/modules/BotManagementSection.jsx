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
import CommandToggleModule from './CommandToggleModule';
import ScheduledEmbedsModule from './ScheduledEmbedsModule';
import AutomodRuleTesterModule from './AutomodRuleTesterModule';
import ModerationQuickActionsModule from './ModerationQuickActionsModule';
import RolePermissionManagerModule from './RolePermissionManagerModule';
import BackupsModule from './BackupsModule';
import '../../assets/css/BotManagementSection.css';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory } from 'react-icons/fa';

function BotManagementSection() {
  const { userGuilds } = useUser();
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const [activeModule, setActiveModule] = useState('commands');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close sidebar on mobile when item clicked
  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

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

      {/* Bot Module Categories */}
      <div className="bot-modules-grid">
        {moduleCategories.map((category, idx) => (
          <CollapsibleCategory 
            key={category.title} 
            title={category.title}
            defaultOpen={idx === 0}
          >
            <div className="module-buttons-grid">
              {category.modules.map(module => {
                const IconComponent = module.icon;
                return (
                  <button
                    key={module.id}
                    className={`module-card-button ${activeModule === module.id ? 'active' : ''}`}
                    onClick={() => { setActiveModule(module.id); closeSidebar(); }}
                  >
                    <span className="module-icon"><IconComponent size={24} /></span>
                    <span className="module-label">{module.label}</span>
                  </button>
                );
              })}
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
