/**
 * ModuleGrid Component
 * Displays a grid of modules for the selected platform
 * Each module is a clickable tile that navigates to its detail view
 */

import React, { useEffect, useState } from 'react';
import { FaCode, FaShieldAlt, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory, FaRobot, FaTicketAlt, FaCog, FaCogs, FaTools, FaWrench, FaMagic, FaUsers } from 'react-icons/fa';
import '../../../assets/css/ModuleGrid.css';
import ModuleCard from '../../elements/ModuleCard';
import { fetchGuildModules, setGuildModuleEnabled } from '../../../services/modules';
import { useSelectedGuild } from '../../../contexts/SelectedGuildContext';

// Discord module definitions
const DISCORD_MODULES = [
  {
    id: 'custom-commands',
    label: 'Custom Commands',
    icon: FaCode,
    description: 'Create custom slash commands and text triggers',
    category: 'Configuration',
    isBotModule: true
  },
  {
    id: 'welcome',
    label: 'Welcome Messages',
    icon: FaHandPaper,
    description: 'Configure welcome and goodbye messages',
    category: 'Configuration',
    isBotModule: true
  },
  {
    id: 'embeds',
    label: 'Embeds',
    icon: FaEnvelope,
    description: 'Design and manage rich embed messages',
    category: 'Configuration',
    isBotModule: true
  },
  {
    id: 'automod',
    label: 'Auto Moderation',
    icon: FaShieldAlt,
    description: 'Automated content moderation rules',
    category: 'Moderation',
    isBotModule: true
  },
  {
    id: 'quick-actions',
    label: 'Quick Actions',
    icon: FaGavel,
    description: 'Fast moderation actions and shortcuts',
    category: 'Moderation',
    isBotModule: true
  },
  {
    id: 'role-permissions',
    label: 'Role Permissions',
    icon: FaUserShield,
    description: 'Manage role-based permissions',
    category: 'Moderation',
    isBotModule: true
  },
  // {
  //   id: 'scheduled-embeds',
  //   label: 'Scheduled Embeds',
  //   icon: FaClock,
  //   description: 'Schedule automated embed messages',
  //   category: 'Automation',
  //   isBotModule: true
  // },
  {
    id: 'workers',
    label: 'Workers',
    icon: FaRobot,
    description: 'Event-driven automation workflows',
    category: 'Automation',
    isBotModule: true
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: FaTicketAlt,
    description: 'Support ticket system management',
    category: 'Utilities',
    isBotModule: true
  },
  {
    id: 'backups',
    label: 'Server Backups',
    icon: FaHistory,
    description: 'Backup and restore server configurations',
    category: 'Utilities',
    isBotModule: true
  }
];


// Category icon map for better visual grouping
const CATEGORY_ICONS = {
  Configuration: FaCogs,
  Moderation: FaShieldAlt,
  Automation: FaMagic,
  Utilities: FaTools,
  Other: FaWrench
};

// Platform-specific module maps
const PLATFORM_MODULES = {
  discord: DISCORD_MODULES,
  reddit: [],
  youtube: []
};


function ModuleGrid({ platform, onModuleSelect }) {
  // Only show bot modules in the grid
  const modules = (PLATFORM_MODULES[platform] || []).filter(m => m.isBotModule !== false);
  const { selectedGuildId } = useSelectedGuild();
  const [guildModules, setGuildModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingsModule, setSettingsModule] = useState(null);

  useEffect(() => {
    async function loadModules() {
      if (!selectedGuildId) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('qft-token');
        const res = await fetchGuildModules(selectedGuildId, token);
        setGuildModules(res.modules || []);
      } catch (e) {
        setGuildModules([]);
      }
      setLoading(false);
    }
    loadModules();
  }, [selectedGuildId]);

  const handleToggle = async (moduleKey, currentEnabled) => {
    try {
      const token = localStorage.getItem('qft-token');
      await setGuildModuleEnabled(selectedGuildId, moduleKey, !currentEnabled, token);
      // Refetch modules from backend to ensure UI is in sync
      const res = await fetchGuildModules(selectedGuildId, token);
      setGuildModules(res.modules || []);
    } catch (e) {}
  };

  const handleSettings = (moduleKey) => {
    setSettingsModule(moduleKey);
    // TODO: Open modal/drawer for module settings
  };

  // Filter out non-bot modules (where configuration.bot_module === false)
  const filteredGuildModules = guildModules.filter(
    (module) =>
      !module.configuration ||
      typeof module.configuration !== 'object' ||
      module.configuration.bot_module !== false
  );

  // Group modules by category
  const groupedModules = filteredGuildModules.reduce((acc, module) => {
    const cat = module.category || module.category_key || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(module);
    return acc;
  }, {});

  if (loading) {
    return <div className="qft-card">Loading modules...</div>;
  }
  if (filteredGuildModules.length === 0) {
    return <div className="qft-card">No modules available for this server.</div>;
  }

  return (
    <main className="page-content">
      <div className="module-grid-container">
        {Object.entries(groupedModules).map(([category, categoryModules]) => {
          const CategoryIcon = CATEGORY_ICONS[category] || FaWrench;
          return (
            <div key={category} className="module-category-section">
              <h2 className="module-category-title">
                <span style={{ marginRight: 8, verticalAlign: 'middle' }}><CategoryIcon size={22} /></span>
                {category}
              </h2>
              <div className="module-grid">
                {categoryModules.map((module) => (
                  <ModuleCard
                    key={module.module_key || module.id}
                    label={module.name || module.label}
                    icon={module.icon || FaCog}
                    enabled={!!module.enabled}
                    onToggle={() => handleToggle(module.module_key, !!module.enabled)}
                    onSettings={() => handleSettings(module.module_key)}
                    active={false}
                    onClick={() => {
                      // Special-case: route 'commands' to 'custom-commands' for correct URL
                      const routeKey = (module.module_key === 'commands') ? 'custom-commands' : (module.module_key || module.id);
                      onModuleSelect(routeKey);
                    }}
                    categoryIcon={CategoryIcon}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default ModuleGrid;
