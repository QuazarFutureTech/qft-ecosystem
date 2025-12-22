/**
 * Navigation Controller
 * Dynamically determines which navigation items to display based on breadcrumb context and active route
 * 
 * Purpose:
 * - Map routes to navigation contexts (Control Panel, Ai Modules, Specific Module)
 * - Return appropriate navigation items for the current breadcrumb level
 * - Ensure side nav updates instantly when route/breadcrumb changes
 */

// Define all module categories (from BotManagementSection)
export const BOT_MODULE_CATEGORIES = [
  {
    title: 'Configuration',
    modules: [
      { id: 'commands', label: 'Custom Commands' },
      { id: 'welcome', label: 'Welcome Messages' },
      { id: 'embeds', label: 'Embeds' },
      { id: 'command-toggle', label: 'Command Toggle' },
    ]
  },
  {
    title: 'Moderation',
    modules: [
      { id: 'automod', label: 'Auto Moderation' },
      { id: 'automod-tester', label: 'Automod Tester' },
      { id: 'quick-actions', label: 'Quick Actions' },
      { id: 'role-permissions', label: 'Role Permissions' },
    ]
  },
  {
    title: 'Automation',
    modules: [
      { id: 'scheduled-embeds', label: 'Scheduled Embeds' },
    ]
  },
  {
    title: 'Utilities',
    modules: [
      { id: 'backups', label: 'Server Backups' },
    ]
  }
];

// Define all Control Panel sections
export const CONTROL_PANEL_SECTIONS = [
  {
    title: 'Administration',
    sections: [
      { id: 'users', label: 'User Management' },
      { id: 'permissions', label: 'Roles & Permissions' },
      { id: 'ai-modules', label: 'Ai Modules' },
      { id: 'registry', label: 'Registry' },
    ]
  },
  {
    title: 'System',
    sections: [
      { id: 'logs', label: 'System Logs' },
      { id: 'module-manager', label: 'Module Manager' },
      { id: 'database', label: 'Database Manager' },
    ]
  },
  {
    title: 'Utilities',
    sections: [
      { id: 'analytics', label: 'Analytics' },
      { id: 'tools', label: 'Tools' },
    ]
  }
];

/**
 * Navigation Context Types
 * Determines which navigation level to display in the side nav
 */
export const NAV_CONTEXT = {
  CONTROL_PANEL_ROOT: 'control-panel-root',    // Main Control Panel sections
  BOT_CONTROL_MODULES: 'bot-control-modules',  // Bot module navigation (when inside Bot Control)
};

/**
 * Determine the current navigation context based on active section
 * 
 * @param {string} activeSection - Currently active section ID (e.g., 'bot-control', 'users')
 * @returns {string} Navigation context type
 */
export function determineNavContext(activeSection) {
  if (activeSection === 'bot-control') {
    return NAV_CONTEXT.BOT_CONTROL_MODULES;
  }
  return NAV_CONTEXT.CONTROL_PANEL_ROOT;
}

/**
 * Get navigation items for the current context
 * 
 * @param {string} navContext - Navigation context from determineNavContext()
 * @param {Object} options - Additional options
 * @param {string} options.activeModule - Currently active bot module (required for BOT_CONTROL_MODULES context)
 * @param {string} options.activeSection - Currently active control panel section (required for CONTROL_PANEL_ROOT context)
 * @returns {Array} Array of navigation items with structure: [{ title: string, items: Array }]
 */
export function getNavigationItems(navContext, options = {}) {
  switch (navContext) {
    case NAV_CONTEXT.BOT_CONTROL_MODULES:
      // Return bot module categories
      return BOT_MODULE_CATEGORIES;
    
    case NAV_CONTEXT.CONTROL_PANEL_ROOT:
    default:
      // Return control panel sections
      return CONTROL_PANEL_SECTIONS;
  }
}

/**
 * Flattened item lookup helper
 * Returns all items as a flat array for easier searching
 * 
 * @param {string} navContext - Navigation context
 * @returns {Array} Flat array of all navigation items
 */
export function getFlatNavItems(navContext) {
  const navItems = getNavigationItems(navContext);
  return navItems.flatMap(category => {
    const key = category.modules ? 'modules' : 'sections';
    return category[key] || [];
  });
}

/**
 * Get the active item label for breadcrumb updates
 * 
 * @param {string} navContext - Navigation context
 * @param {string} activeId - Active section or module ID
 * @returns {string} Display label for the active item
 */
export function getActiveItemLabel(navContext, activeId) {
  const items = getFlatNavItems(navContext);
  const item = items.find(i => i.id === activeId);
  return item ? item.label : '';
}

/**
 * Determine if the navigation should switch contexts
 * Useful for detecting when user navigates to a different section
 * 
 * @param {string} prevSection - Previous active section
 * @param {string} nextSection - Next active section
 * @returns {boolean} True if context should change
 */
export function shouldSwitchNavContext(prevSection, nextSection) {
  const prevContext = determineNavContext(prevSection);
  const nextContext = determineNavContext(nextSection);
  return prevContext !== nextContext;
}

/**
 * Get breadcrumb path for current navigation state
 * Useful for keeping breadcrumbs in sync with side nav
 * 
 * @param {string} navContext - Navigation context
 * @param {string} activeId - Active section or module ID
 * @param {string} activeLabel - Active item label
 * @returns {Array} Breadcrumb items
 */
export function getBreadcrumbsForNav(navContext, activeId, activeLabel) {
  if (navContext === NAV_CONTEXT.BOT_CONTROL_MODULES) {
    return [
      { label: 'Home', path: '/' },
      { label: 'Control Panel', path: '/control-panel' },
      { label: 'Bot Control', path: null },
      { label: activeLabel, path: null }
    ];
  }
  
  // Control Panel Root
  return [
    { label: 'Home', path: '/' },
    { label: 'Control Panel', path: '/control-panel' },
    { label: activeLabel, path: null }
  ];
}

/**
 * Format navigation items with icons for rendering
 * (Icons are passed separately to keep this utility framework-agnostic)
 * 
 * @param {Array} navItems - Navigation items from getNavigationItems()
 * @param {Object} iconMap - Map of section/module IDs to icon components
 * @returns {Array} Formatted navigation items with icons attached
 */
export function attachIconsToNavItems(navItems, iconMap) {
  return navItems.map(category => {
    const key = category.modules ? 'modules' : 'sections';
    return {
      ...category,
      [key]: category[key].map(item => ({
        ...item,
        icon: iconMap[item.id] || null
      }))
    };
  });
}
