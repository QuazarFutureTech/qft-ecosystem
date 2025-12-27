// qft-api-gateway/src/services/moduleService.js
// Service for managing page modules, categories, and their configurations

const db = require('../db');

// ===== PAGE OPERATIONS =====

/**
 * Get all pages with their categories and modules
 */
const getAllPages = async () => {
  const query = `
    SELECT 
      p.id as page_id,
      p.page_key,
      p.name as page_name,
      p.description as page_description,
      p.icon as page_icon,
      p.display_order as page_order,
      p.enabled as page_enabled,
      c.id as category_id,
      c.category_key,
      c.name as category_name,
      c.description as category_description,
      c.display_order as category_order,
      c.enabled as category_enabled,
      m.id as module_id,
      m.module_key,
      m.name as module_name,
      m.description as module_description,
      m.component_name,
      m.icon as module_icon,
      m.display_order as module_order,
      m.enabled as module_enabled,
      m.configuration,
      m.required_clearance
    FROM pages p
    LEFT JOIN page_categories c ON p.id = c.page_id
    LEFT JOIN page_modules m ON c.id = m.category_id
    ORDER BY p.display_order, c.display_order, m.display_order;
  `;

  const result = await db.query(query);
  
  // Transform flat result into nested structure
  const pages = {};
  
  result.rows.forEach(row => {
    // Initialize page if not exists
    if (!pages[row.page_key]) {
      pages[row.page_key] = {
        id: row.page_id,
        page_key: row.page_key,
        name: row.page_name,
        description: row.page_description,
        icon: row.page_icon,
        display_order: row.page_order,
        enabled: row.page_enabled,
        categories: []
      };
    }

    // Add category if exists and not already added
    if (row.category_id) {
      let category = pages[row.page_key].categories.find(c => c.id === row.category_id);
      
      if (!category) {
        category = {
          id: row.category_id,
          category_key: row.category_key,
          name: row.category_name,
          description: row.category_description,
          display_order: row.category_order,
          enabled: row.category_enabled,
          modules: []
        };
        pages[row.page_key].categories.push(category);
      }

      // Add module if exists
      if (row.module_id) {
        category.modules.push({
          id: row.module_id,
          module_key: row.module_key,
          name: row.module_name,
          description: row.module_description,
          component_name: row.component_name,
          icon: row.module_icon,
          display_order: row.module_order,
          enabled: row.module_enabled,
          configuration: row.configuration,
          required_clearance: row.required_clearance
        });
      }
    }
  });

  return pages;
};

/**
 * Get a single page by key with all its data
 */
const getPageByKey = async (pageKey) => {
  const allPages = await getAllPages();
  return allPages[pageKey] || null;
};

/**
 * Create a new page
 */
const createPage = async (pageKey, name, description = null, icon = null, displayOrder = 0) => {
  const query = `
    INSERT INTO pages (page_key, name, description, icon, display_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  
  const result = await db.query(query, [pageKey, name, description, icon, displayOrder]);
  return result.rows[0];
};

/**
 * Update a page
 */
const updatePage = async (pageId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(pageId);

  const query = `
    UPDATE pages 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Delete a page (cascades to categories and modules)
 */
const deletePage = async (pageId) => {
  const query = 'DELETE FROM pages WHERE id = $1 RETURNING *;';
  const result = await db.query(query, [pageId]);
  return result.rows[0];
};

// ===== CATEGORY OPERATIONS =====

/**
 * Create a new category
 */
const createCategory = async (pageId, categoryKey, name, description = null, displayOrder = 0) => {
  const query = `
    INSERT INTO page_categories (page_id, category_key, name, description, display_order)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  
  const result = await db.query(query, [pageId, categoryKey, name, description, displayOrder]);
  return result.rows[0];
};

/**
 * Update a category
 */
const updateCategory = async (categoryId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(categoryId);

  const query = `
    UPDATE page_categories 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Delete a category (cascades to modules)
 */
const deleteCategory = async (categoryId) => {
  const query = 'DELETE FROM page_categories WHERE id = $1 RETURNING *;';
  const result = await db.query(query, [categoryId]);
  return result.rows[0];
};

// ===== MODULE OPERATIONS =====

/**
 * Create a new module
 */
const createModule = async (categoryId, moduleKey, name, componentName, description = null, icon = null, displayOrder = 0, requiredClearance = null, configuration = {}) => {
  const query = `
    INSERT INTO page_modules (category_id, module_key, name, component_name, description, icon, display_order, required_clearance, configuration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  
  const result = await db.query(query, [categoryId, moduleKey, name, componentName, description, icon, displayOrder, requiredClearance, JSON.stringify(configuration)]);
  return result.rows[0];
};

/**
 * Update a module
 */
const updateModule = async (moduleId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined) {
      // Handle JSON fields
      if (key === 'configuration' && typeof updates[key] === 'object') {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(moduleId);

  const query = `
    UPDATE page_modules 
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Delete a module
 */
const deleteModule = async (moduleId) => {
  const query = 'DELETE FROM page_modules WHERE id = $1 RETURNING *;';
  const result = await db.query(query, [moduleId]);
  return result.rows[0];
};

/**
 * Bulk update display orders for reordering
 */
const updateModuleOrders = async (updates) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const update of updates) {
      await client.query(
        'UPDATE page_modules SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [update.display_order, update.module_id]
      );
    }

    await client.query('COMMIT');
    return { success: true, updated: updates.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Bulk update category orders
 */
const updateCategoryOrders = async (updates) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const update of updates) {
      await client.query(
        'UPDATE page_categories SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [update.display_order, update.category_id]
      );
    }

    await client.query('COMMIT');
    return { success: true, updated: updates.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Initialize default module structure for a guild
 */
const initializeDefaultModules = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check if any pages exist
    const existingPages = await client.query('SELECT COUNT(*) FROM pages');
    if (parseInt(existingPages.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Default modules already initialized' };
    }

    // Create Bot Management page
    const botPage = await client.query(`
      INSERT INTO pages (page_key, name, description, icon, display_order)
      VALUES ('bot-management', 'Bot Management', 'Discord bot configuration and automation', 'FaRobot', 0)
      RETURNING id;
    `);
    const botPageId = botPage.rows[0].id;

    // Bot Management Categories
    const configCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'config', 'Configuration', 0)
      RETURNING id;
    `, [botPageId]);

    const modCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'moderation', 'Moderation', 1)
      RETURNING id;
    `, [botPageId]);

    const autoCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'automation', 'Automation', 2)
      RETURNING id;
    `, [botPageId]);

    // Bot Management Modules
    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, display_order, enabled)
      VALUES 
        ($1, 'commands', 'Custom Commands', 'CustomCommandsModule', 0, true),
        ($1, 'welcome', 'Welcome Messages', 'WelcomeModule', 1, true),
        ($1, 'embeds', 'Embeds', 'EmbedsModule', 2, true),
        ($1, 'command-toggle', 'Command Toggle', 'CommandToggleModule', 3, true);
    `, [configCat.rows[0].id]);

    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, display_order, enabled)
      VALUES 
        ($1, 'automod', 'Auto Moderation', 'AutomodModule', 0, true),
        ($1, 'automod-tester', 'Automod Tester', 'AutomodTesterModule', 1, true),
        ($1, 'quick-actions', 'Quick Actions', 'QuickActionsModule', 2, true),
        ($1, 'role-permissions', 'Role Permissions', 'RolePermissionsModule', 3, true);
    `, [modCat.rows[0].id]);

    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, display_order, enabled)
      VALUES 
        ($1, 'scheduled-embeds', 'Scheduled Embeds', 'ScheduledEmbedsModule', 0, true),
        ($1, 'backups', 'Server Backups', 'BackupsModule', 1, true);
    `, [autoCat.rows[0].id]);

    // Create Command Center page
    const cmdPage = await client.query(`
      INSERT INTO pages (page_key, name, description, icon, display_order)
      VALUES ('command-center', 'Command Center', 'Staff operations and management hub', 'FaShieldAlt', 1)
      RETURNING id;
    `);
    const cmdPageId = cmdPage.rows[0].id;

    // Command Center Categories
    const opsCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'operations', 'Operations', 0)
      RETURNING id;
    `, [cmdPageId]);

    const mgmtCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'management', 'Management', 1)
      RETURNING id;
    `, [cmdPageId]);

    // Command Center Modules
    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, display_order, enabled, required_clearance)
      VALUES 
        ($1, 'tasks', 'Tasks & Projects', 'TasksModule', 0, true, '0'),
        ($1, 'calendar', 'Calendar & Events', 'CalendarModule', 1, true, '0');
    `, [opsCat.rows[0].id]);

    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, display_order, enabled, required_clearance)
      VALUES 
        ($1, 'team', 'Team Management', 'TeamModule', 0, true, '1'),
        ($1, 'reports', 'Reports & Analytics', 'ReportsModule', 1, true, '1');
    `, [mgmtCat.rows[0].id]);

    // Create Control Panel page
    const ctrlPage = await client.query(`
      INSERT INTO pages (page_key, name, description, icon, display_order)
      VALUES ('control-panel', 'Control Panel', 'System administration and database tools', 'FaCog', 2)
      RETURNING id;
    `);
    const ctrlPageId = ctrlPage.rows[0].id;

    // Control Panel Categories
    const adminCat = await client.query(`
      INSERT INTO page_categories (page_id, category_key, name, display_order)
      VALUES ($1, 'admin-tools', 'Admin Tools', 0)
      RETURNING id;
    `, [ctrlPageId]);

    // Control Panel Modules (Database Manager)
    await client.query(`
      INSERT INTO page_modules (category_id, module_key, name, component_name, description, icon, display_order, enabled, required_clearance)
      VALUES 
        ($1, 'database-manager', 'Database Manager', 'DatabaseManagerModule', 'View, backup, and manage database tables', 'FaDatabase', 0, true, 'α');
    `, [adminCat.rows[0].id]);

    await client.query('COMMIT');
    return { success: true, message: 'Default modules initialized successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  // Pages
  getAllPages,
  getPageByKey,
  createPage,
  updatePage,
  deletePage,
  
  // Categories
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Modules
  createModule,
  updateModule,
  deleteModule,
  updateModuleOrders,
  updateCategoryOrders,
  
  // Initialization
  initializeDefaultModules
};
