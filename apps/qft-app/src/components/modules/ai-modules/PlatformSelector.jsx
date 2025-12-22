/**
 * PlatformSelector Component
 * Sidebar displaying available platforms (Discord, Reddit, YouTube, etc.)
 * Only Discord is active; others are disabled placeholders
 */

import React from 'react';
import { FaDiscord, FaReddit, FaYoutube, FaPlus } from 'react-icons/fa';
import CollapsibleCategory from '../../elements/CollapsibleCategory';
import '../../../Layout.css';

const PLATFORMS = [
  {
    id: 'discord',
    label: 'Discord',
    icon: FaDiscord,
    enabled: true,
    description: 'Bot commands, moderation, embeds'
  },
  {
    id: 'reddit',
    label: 'Reddit',
    icon: FaReddit,
    enabled: false,
    description: 'Coming soon'
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: FaYoutube,
    enabled: false,
    description: 'Coming soon'
  }
];

function PlatformSelector({ sidebarOpen, onCloseSidebar, onPlatformSelect }) {
  return (
    <aside className={`page-sidebar ${sidebarOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        <CollapsibleCategory title="Platforms" defaultOpen={true}>
          {PLATFORMS.map((platform) => {
            const IconComponent = platform.icon;
            const isDisabled = !platform.enabled;

            return (
              <button
                key={platform.id}
                className={`sidebar-nav-item ${isDisabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (platform.enabled) {
                    onPlatformSelect(platform.id);
                  }
                }}
                disabled={isDisabled}
                title={platform.description}
                style={isDisabled ? { 
                  opacity: 0.5, 
                  cursor: 'not-allowed',
                  pointerEvents: 'auto' 
                } : {}}
              >
                <span className="nav-icon">
                  <IconComponent />
                </span>
                <span className="nav-label">{platform.label}</span>
                {isDisabled && (
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: '0.75rem', 
                    opacity: 0.7 
                  }}>
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </CollapsibleCategory>

        <CollapsibleCategory title="More Platforms" defaultOpen={false}>
          <button
            className="sidebar-nav-item disabled"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            disabled
          >
            <span className="nav-icon">
              <FaPlus />
            </span>
            <span className="nav-label">Add Platform</span>
          </button>
        </CollapsibleCategory>
      </nav>
    </aside>
  );
}

export default PlatformSelector;
