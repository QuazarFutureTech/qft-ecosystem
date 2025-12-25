/**
 * ModuleList Component
 * Sidebar list of modules for a specific platform
 * Displayed when user is in module grid or detail view
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import { useSelectedGuild } from '../../../contexts/SelectedGuildContext';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory, FaRobot, FaTicketAlt, FaArrowLeft } from 'react-icons/fa';
import CollapsibleCategory from '../../elements/CollapsibleCategory';
import '../AdaptiveNavigation.css';

// Module definitions with categorization
const DISCORD_MODULE_CATEGORIES = [
  {
    title: 'Configuration',
    modules: [
      { id: 'custom-commands', label: 'Custom Commands', icon: FaCode },
      { id: 'welcome', label: 'Welcome Messages', icon: FaHandPaper },
      { id: 'embeds', label: 'Embeds', icon: FaEnvelope },
      { id: 'command-toggle', label: 'Command Toggle', icon: FaToggleOn },
    ]
  },
  {
    title: 'Moderation',
    modules: [
      { id: 'automod', label: 'Auto Moderation', icon: FaShieldAlt },
      { id: 'automod-tester', label: 'Automod Tester', icon: FaVial },
      { id: 'quick-actions', label: 'Quick Actions', icon: FaGavel },
      { id: 'role-permissions', label: 'Role Permissions', icon: FaUserShield },
    ]
  },
  {
    title: 'Automation',
    modules: [
      { id: 'scheduled-embeds', label: 'Scheduled Embeds', icon: FaClock },
      { id: 'workers', label: 'Workers', icon: FaRobot },
    ]
  },
  {
    title: 'Utilities',
    modules: [
      { id: 'tickets', label: 'Tickets', icon: FaTicketAlt },
      { id: 'backups', label: 'Server Backups', icon: FaHistory },
    ]
  }
];

const PLATFORM_MODULE_LISTS = {
  discord: DISCORD_MODULE_CATEGORIES,
  reddit: [],
  youtube: []
};

function ModuleList({ platform, activeModule, onCloseSidebar, onModuleSelect }) {
  const navigate = useNavigate();
  const { userGuilds } = useUser();
  const { selectedGuildId, setSelectedGuildId } = useSelectedGuild();
  const moduleCategories = PLATFORM_MODULE_LISTS[platform] || [];

  return (
    <nav className="sidebar-nav">
      {/* Back to platform grid button */}
      <button
        className="sidebar-nav-item"
        onClick={() => {
          navigate(`/control-panel/ai-modules/${platform}`);
          onCloseSidebar();
        }}
        style={{ 
          marginBottom: '10px', 
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px'
        }}
      >
        <span className="nav-icon">
          <FaArrowLeft />
        </span>
        <span className="nav-label">Back to Modules</span>
      </button>

      {/* Server Selector */}
      <div className="sidebar-section" style={{ padding: '10px' }}>
        <label htmlFor="guild-selector" style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Server
        </label>
        <select
          id="guild-selector"
          className="qft-input"
          value={selectedGuildId || ''}
          onChange={(e) => setSelectedGuildId(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="" disabled>Select a Server</option>
          {userGuilds.map(guild => (
            <option key={guild.id} value={guild.id}>
              {guild.name}
            </option>
          ))}
        </select>
      </div>

      {moduleCategories.map((category, idx) => (
        <CollapsibleCategory
          key={category.title}
          title={category.title}
          defaultOpen={idx === 0}
        >
          {category.modules.map((module) => {
            const IconComponent = module.icon;
            const isActive = activeModule === module.id;

            return (
              <button
                key={module.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onModuleSelect(module.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">
                  <IconComponent />
                </span>
                <span className="nav-label">{module.label}</span>
              </button>
            );
          })}
        </CollapsibleCategory>
      ))}
    </nav>
  );
}

export default ModuleList;