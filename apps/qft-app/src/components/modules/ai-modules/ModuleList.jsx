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
    ]
  },
  {
    title: 'Moderation',
    modules: [
      { id: 'automod', label: 'Auto Moderation', icon: FaShieldAlt },
      { id: 'quick-actions', label: 'Quick Actions', icon: FaGavel },
      { id: 'role-permissions', label: 'Role Permissions', icon: FaUserShield },
    ]
  },
  {
    title: 'Automation',
    modules: [
      // { id: 'scheduled-embeds', label: 'Scheduled Embeds', icon: FaClock },
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
  const [availableGuilds, setAvailableGuilds] = React.useState([]);
  const [checkingGuilds, setCheckingGuilds] = React.useState(false);
  React.useEffect(() => {
    let isMounted = true;
    async function filterGuilds() {
      setCheckingGuilds(true);
      const token = localStorage.getItem('qft-token');
      const { fetchGuildChannels } = await import('../../../services/discord');
      console.log('[ModuleList] userGuilds:', userGuilds);
      const checks = await Promise.all(
        (Array.isArray(userGuilds) ? userGuilds : []).map(async (guild) => {
          const result = await fetchGuildChannels(guild.id, token);
          console.log(`[ModuleList] fetchGuildChannels(${guild.id}) result:`, result);
          return result.success ? guild : null;
        })
      );
      const filtered = checks.filter(Boolean);
      console.log('[ModuleList] availableGuilds after filtering:', filtered);
      if (isMounted) {
        setAvailableGuilds(filtered);
        setCheckingGuilds(false);
        // Auto-select the first available guild if none is selected or current is not available
        if (filtered.length > 0 && (!selectedGuildId || !filtered.some(g => g.id === selectedGuildId))) {
          setSelectedGuildId(filtered[0].id);
        }
      }
    }
    filterGuilds();
    return () => { isMounted = false; };
  }, [userGuilds, selectedGuildId, setSelectedGuildId]);

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
          disabled={checkingGuilds}
        >
          <option value="" disabled>{checkingGuilds ? 'Checking servers...' : 'Select a Server'}</option>
          {availableGuilds.map(guild => (
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