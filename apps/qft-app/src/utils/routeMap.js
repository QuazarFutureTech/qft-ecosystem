// Route mapping utility for dynamic breadcrumb generation
// Provides labels, paths, and parent relationships for all QFT App routes

export const routeMap = {
  '/': {
    label: 'Home',
    parent: null
  },
  '/chat': {
    label: 'Chat',
    parent: '/'
  },
  '/feed': { // Legacy route
    label: 'Chat',
    parent: '/'
  },
  '/shop': {
    label: 'Shop',
    parent: '/'
  },
  '/commands': {
    label: 'Commands',
    parent: '/'
  },
  '/profile': {
    label: 'Profile',
    parent: '/'
  },
  '/settings': {
    label: 'Settings',
    parent: '/'
  },
  '/command-center': {
    label: 'Command Center',
    parent: '/'
  },
  '/control-panel': {
    label: 'Control Panel',
    parent: '/'
  },
  '/control-panel/users': {
    label: 'User Management',
    parent: '/control-panel'
  },
  '/control-panel/permissions': {
    label: 'Roles & Permissions',
    parent: '/control-panel'
  },
  '/control-panel/bot-control': {
    label: 'Bot Control',
    parent: '/control-panel'
  },
  '/control-panel/ai-modules': {
    label: 'Ai Modules',
    parent: '/control-panel'
  },
  '/control-panel/ai-modules/discord': {
    label: 'Discord',
    parent: '/control-panel/ai-modules'
  },
  '/control-panel/ai-modules/discord/custom-commands': {
    label: 'Custom Commands',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/welcome': {
    label: 'Welcome Messages',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/embeds': {
    label: 'Embeds',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/command-toggle': {
    label: 'Command Toggle',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/automod': {
    label: 'Auto Moderation',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/automod-tester': {
    label: 'Automod Tester',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/quick-actions': {
    label: 'Quick Actions',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/role-permissions': {
    label: 'Role Permissions',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/scheduled-embeds': {
    label: 'Scheduled Embeds',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/workers': {
    label: 'Workers',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/tickets': {
    label: 'Tickets',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/discord/backups': {
    label: 'Server Backups',
    parent: '/control-panel/ai-modules/discord'
  },
  '/control-panel/ai-modules/reddit': {
    label: 'Reddit',
    parent: '/control-panel/ai-modules'
  },
  '/control-panel/ai-modules/youtube': {
    label: 'YouTube',
    parent: '/control-panel/ai-modules'
  },
  '/control-panel/registry': {
    label: 'Registry',
    parent: '/control-panel'
  },
  '/control-panel/logs': {
    label: 'System Logs',
    parent: '/control-panel'
  },
  '/control-panel/module-manager': {
    label: 'Module Manager',
    parent: '/control-panel'
  },
  '/control-panel/database': {
    label: 'Database Manager',
    parent: '/control-panel'
  },
  '/control-panel/analytics': {
    label: 'Analytics',
    parent: '/control-panel'
  },
  '/control-panel/tools': {
    label: 'Tools',
    parent: '/control-panel'
  },
  '/bot-management': {
    label: 'Bot Management',
    parent: '/'
  },
  '/bot-management/commands': {
    label: 'Custom Commands',
    parent: '/bot-management'
  },
  '/bot-management/welcome': {
    label: 'Welcome Messages',
    parent: '/bot-management'
  },
  '/bot-management/embeds': {
    label: 'Embeds',
    parent: '/bot-management'
  },
  '/bot-management/toggles': {
    label: 'Command Toggles',
    parent: '/bot-management'
  },
  '/bot-management/scheduled': {
    label: 'Scheduled Embeds',
    parent: '/bot-management'
  },
  '/bot-management/automod': {
    label: 'Automod',
    parent: '/bot-management'
  },
  '/bot-management/tester': {
    label: 'Rule Tester',
    parent: '/bot-management'
  },
  '/bot-management/moderation': {
    label: 'Moderation',
    parent: '/bot-management'
  },
  '/bot-management/roles': {
    label: 'Role Manager',
    parent: '/bot-management'
  },
  '/bot-management/backups': {
    label: 'Backups',
    parent: '/bot-management'
  }
};

/**
 * Build breadcrumb chain from route map
 * @param {string} pathname - Current pathname
 * @param {Object} customLabel - Optional custom label for current page
 * @returns {Array} Array of breadcrumb items
 */
export function buildBreadcrumbsFromRoute(pathname, customLabel = null) {
  const items = [];
  let currentPath = pathname;

  // Handle trailing slash
  if (currentPath !== '/' && currentPath.endsWith('/')) {
    currentPath = currentPath.slice(0, -1);
  }

  // Build chain by following parent relationships
  const visited = new Set();
  while (currentPath && !visited.has(currentPath)) {
    visited.add(currentPath);
    
    const route = routeMap[currentPath];
    if (route) {
      items.unshift({
        label: customLabel && items.length === 0 ? customLabel : route.label,
        path: currentPath === pathname ? null : currentPath // Last item non-clickable
      });
      currentPath = route.parent;
    } else {
      // Fallback for unmapped routes - try to extract from segments
      const segments = currentPath.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const label = customLabel && items.length === 0 
          ? customLabel 
          : lastSegment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        items.unshift({
          label,
          path: currentPath === pathname ? null : currentPath
        });
        
        // Try parent path
        currentPath = '/' + segments.slice(0, -1).join('/');
        if (currentPath === '/') {
          break;
        }
      } else {
        break;
      }
    }
  }

  return items;
}

/**
 * Build breadcrumbs for Control Panel sections
 * @param {string} sectionId - Active section ID (e.g., 'users', 'bot-control')
 * @param {string} sectionLabel - Display label for the section
 * @returns {Array} Breadcrumb items
 */
export function buildControlPanelBreadcrumbs(sectionId, sectionLabel) {
  return [
    { label: 'Control Panel', path: '/control-panel' },
    { label: sectionLabel, path: null }
  ];
}

/**
 * Build breadcrumbs for Bot Management modules
 * @param {string} moduleId - Active module ID (e.g., 'commands', 'automod')
 * @param {string} moduleLabel - Display label for the module
 * @returns {Array} Breadcrumb items
 */
export function buildBotManagementBreadcrumbs(moduleId, moduleLabel) {
  return [
    { label: 'Bot Management', path: '/bot-management' },
    { label: moduleLabel, path: null }
  ];
}

/**
 * Build breadcrumbs with custom detail page
 * @param {string} basePath - Base route path
 * @param {string} detailLabel - Label for detail page
 * @returns {Array} Breadcrumb items
 */
export function buildDetailBreadcrumbs(basePath, detailLabel) {
  const baseItems = buildBreadcrumbsFromRoute(basePath);
  return [
    ...baseItems.map(item => ({ ...item, path: item.path || basePath })),
    { label: detailLabel, path: null }
  ];
}
