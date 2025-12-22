/**
 * ModuleGrid Component
 * Displays a grid of modules for the selected platform
 * Each module is a clickable tile that navigates to its detail view
 */

import React from 'react';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory, FaRobot, FaTicketAlt, FaCog } from 'react-icons/fa';
import '../../../assets/css/ModuleGrid.css';

// Discord module definitions
const DISCORD_MODULES = [
  {
    id: 'custom-commands',
    label: 'Custom Commands',
    icon: FaCode,
    description: 'Create custom slash commands and text triggers',
    category: 'Configuration'
  },
  {
    id: 'welcome',
    label: 'Welcome Messages',
    icon: FaHandPaper,
    description: 'Configure welcome and goodbye messages',
    category: 'Configuration'
  },
  {
    id: 'embeds',
    label: 'Embeds',
    icon: FaEnvelope,
    description: 'Design and manage rich embed messages',
    category: 'Configuration'
  },
  {
    id: 'command-toggle',
    label: 'Command Toggle',
    icon: FaToggleOn,
    description: 'Enable or disable bot commands',
    category: 'Configuration'
  },
  {
    id: 'automod',
    label: 'Auto Moderation',
    icon: FaShieldAlt,
    description: 'Automated content moderation rules',
    category: 'Moderation'
  },
  {
    id: 'automod-tester',
    label: 'Automod Tester',
    icon: FaVial,
    description: 'Test automod rules before deployment',
    category: 'Moderation'
  },
  {
    id: 'quick-actions',
    label: 'Quick Actions',
    icon: FaGavel,
    description: 'Fast moderation actions and shortcuts',
    category: 'Moderation'
  },
  {
    id: 'role-permissions',
    label: 'Role Permissions',
    icon: FaUserShield,
    description: 'Manage role-based permissions',
    category: 'Moderation'
  },
  {
    id: 'scheduled-embeds',
    label: 'Scheduled Embeds',
    icon: FaClock,
    description: 'Schedule automated embed messages',
    category: 'Automation'
  },
  {
    id: 'workers',
    label: 'Workers',
    icon: FaRobot,
    description: 'Event-driven automation workflows',
    category: 'Automation'
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: FaTicketAlt,
    description: 'Support ticket system management',
    category: 'Utilities'
  },
  {
    id: 'backups',
    label: 'Server Backups',
    icon: FaHistory,
    description: 'Backup and restore server configurations',
    category: 'Utilities'
  }
];

// Platform-specific module maps
const PLATFORM_MODULES = {
  discord: DISCORD_MODULES,
  reddit: [],
  youtube: []
};

function ModuleGrid({ platform, onModuleSelect }) {
  const modules = PLATFORM_MODULES[platform] || [];

  if (modules.length === 0) {
    return (
      <main className="page-content">
        <div className="qft-card">
          <h2>No Modules Available</h2>
          <p>This platform doesn't have any modules configured yet.</p>
        </div>
      </main>
    );
  }

  // Group modules by category
  const groupedModules = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {});

  return (
    <main className="page-content">
      <div className="module-grid-container">
        {Object.entries(groupedModules).map(([category, categoryModules]) => (
          <div key={category} className="module-category-section">
            <h2 className="module-category-title">{category}</h2>
            <div className="module-grid">
              {categoryModules.map((module) => {
                const IconComponent = module.icon;
                return (
                  <button
                    key={module.id}
                    className="module-tile"
                    onClick={() => onModuleSelect(module.id)}
                  >
                    <div className="module-tile-icon">
                      <IconComponent />
                    </div>
                    <h3 className="module-tile-title">{module.label}</h3>
                    <p className="module-tile-description">{module.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default ModuleGrid;
