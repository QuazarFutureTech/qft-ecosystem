/**
 * AdaptiveNavigation Component
 * 
 * Replaces static sidebar with dynamic navigation that adapts based on breadcrumb context.
 * Automatically switches between Control Panel sections and Bot module navigation.
 * 
 * Features:
 * - Auto-switches content when activeSection changes
 * - Shows appropriate navigation items for current context
 * - Maintains all existing styling and behavior
 * - Updates breadcrumbs dynamically
 * - Mobile-responsive with sidebar toggle
 */

import React, { useMemo, useEffect } from 'react';
import CollapsibleCategory from '../elements/CollapsibleCategory';
import {
  determineNavContext,
  getNavigationItems,
  NAV_CONTEXT,
} from '../../utils/navigationController';
import { FaUsers, FaShieldAlt, FaRobot, FaDatabase, FaClipboardList, FaCubes, FaChartLine, FaCode, FaShieldAlt as FaAutomod, FaHandPaper, FaEnvelope, FaToggleOn, FaClock, FaVial, FaGavel, FaUserShield, FaHistory, FaBrain } from 'react-icons/fa';
import './AdaptiveNavigation.css';

// Icon map for both Control Panel sections and Bot modules
const ICON_MAP = {
  // Control Panel sections
  'users': FaUsers,
  'permissions': FaShieldAlt,
  'bot-control': FaRobot,
  'ai-modules': FaBrain,
  'registry': FaDatabase,
  'logs': FaClipboardList,
  'module-manager': FaCubes,
  'database': FaDatabase,
  'analytics': FaChartLine,
  'tools': FaRobot,
  
  // Bot modules
  'commands': FaCode,
  'automod': FaAutomod,
  'welcome': FaHandPaper,
  'embeds': FaEnvelope,
  'command-toggle': FaToggleOn,
  'scheduled-embeds': FaClock,
  'automod-tester': FaVial,
  'quick-actions': FaGavel,
  'role-permissions': FaUserShield,
  'backups': FaHistory,
};

function AdaptiveNavigation({
  activeSection,
  activeModule,
  onSectionChange,
  onModuleChange,
  sidebarOpen,
  onCloseSidebar,
}) {
  // Determine current navigation context
  const navContext = useMemo(
    () => determineNavContext(activeSection),
    [activeSection]
  );

  // Get navigation items for current context
  const navigationItems = useMemo(
    () => {
      const items = getNavigationItems(navContext);
      // Attach icons to navigation items
      return items.map(category => {
        const key = category.modules ? 'modules' : 'sections';
        return {
          ...category,
          [key]: category[key].map(item => ({
            ...item,
            icon: ICON_MAP[item.id],
          }))
        };
      });
    },
    [navContext]
  );

  // Determine which ID to use for active state (section or module)
  const activeId = navContext === NAV_CONTEXT.BOT_CONTROL_MODULES ? activeModule : activeSection;

  // Handle navigation item clicks
  const handleNavClick = (itemId) => {
    if (navContext === NAV_CONTEXT.BOT_CONTROL_MODULES) {
      onModuleChange(itemId);
    } else {
      onSectionChange(itemId);
    }
    onCloseSidebar();
  };

  // Close sidebar on mobile when context changes (page/module switched)
  useEffect(() => {
    if (window.innerWidth <= 768) {
      onCloseSidebar();
    }
  }, [navContext, activeId, onCloseSidebar]);

  return (
    <nav className="sidebar-nav">
      {navigationItems.map((category, idx) => {
        const key = category.modules ? 'modules' : 'sections';
        const items = category[key];

        return (
          <CollapsibleCategory
            key={category.title}
            title={category.title}
            defaultOpen={idx === 0}
          >
            {items.map(item => {
              const IconComponent = item.icon;
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-icon">
                    {IconComponent && <IconComponent />}
                  </span>
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </CollapsibleCategory>
        );
      })}
    </nav>
  );
}

export default AdaptiveNavigation;
