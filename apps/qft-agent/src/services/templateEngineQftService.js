// templateEngineQftService.js
// QFT System Integration for Template Engine
// Provides safe database, registry, user, and permission access from templates

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

/**
 * SAFETY CONFIGURATION
 */
const ALLOWED_TABLES = {
  'users': ['discord_id', 'qft_uuid', 'username', 'email', 'created_at', 'updated_at'],
  'custom_commands': ['id', 'guild_id', 'command_name', 'description', 'created_at', 'enabled'],
  'registry': ['id', 'type', 'key', 'value', 'description'],
  'roles': ['id', 'name', 'clearance_level', 'description'],
  'permissions': ['id', 'permission_key', 'category', 'label', 'description'],
  'tickets': ['id', 'guild_id', 'user_discord_id', 'ticket_number', 'status', 'created_at'],
  'workers': ['id', 'name', 'description', 'enabled', 'assigned_role_id']
};

const READONLY_TABLES = ['role_permissions', 'user_roles', 'activity_logs', 'audit_logs'];
const QUERY_TIMEOUT = 5000; // 5 seconds
const MAX_ROWS = 100;

/**
 * DATABASE QUERY FUNCTIONS
 */

/**
 * Execute a safe SELECT query with WHERE clause
 * @param {string} table - Table name (must be whitelisted)
 * @param {object} where - WHERE conditions as object { column: value }
 * @param {number} limit - Max rows to return (max 100)
 * @returns {Promise<Array>} Array of record objects
 */
async function dbQuery(table, where = {}, limit = 100) {
  try {
    // Validate table
    if (!ALLOWED_TABLES[table]) {
      throw new Error(`Table "${table}" not allowed. Allowed: ${Object.keys(ALLOWED_TABLES).join(', ')}`);
    }

    // Enforce limit
    limit = Math.min(parseInt(limit) || 100, MAX_ROWS);

    // Build WHERE clause
    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (Object.keys(where).length > 0) {
      const conditions = [];
      for (const [column, value] of Object.entries(where)) {
        // Validate column name
        if (!ALLOWED_TABLES[table].includes(column) && column !== '*') {
          throw new Error(`Column "${column}" not allowed in table "${table}"`);
        }
        conditions.push(`${column} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    params.push(limit);
    const limitClause = `LIMIT $${paramCount}`;

    const query = `SELECT * FROM "${table}" ${whereClause} ${limitClause}`;
    const result = await pool.query(query, params);
    
    return result.rows;
  } catch (error) {
    console.error('[dbQuery]', error);
    throw new Error(`Database query failed: ${error.message}`);
  }
}

/**
 * Fetch a single row
 * @param {string} table - Table name
 * @param {string} column - Column to search
 * @param {*} value - Value to search for
 * @returns {Promise<Object|null>} Single record or null
 */
async function dbFetch(table, column, value) {
  const rows = await dbQuery(table, { [column]: value }, 1);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Count rows matching criteria
 * @param {string} table - Table name
 * @param {object} where - WHERE conditions
 * @returns {Promise<number>} Row count
 */
async function dbCount(table, where = {}) {
  try {
    if (!ALLOWED_TABLES[table]) {
      throw new Error(`Table "${table}" not allowed`);
    }

    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (Object.keys(where).length > 0) {
      const conditions = [];
      for (const [column, value] of Object.entries(where)) {
        if (!ALLOWED_TABLES[table].includes(column) && column !== '*') {
          throw new Error(`Column "${column}" not allowed`);
        }
        conditions.push(`${column} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const query = `SELECT COUNT(*) as count FROM "${table}" ${whereClause}`;
    const result = await pool.query(query, params);
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('[dbCount]', error);
    throw new Error(`Count query failed: ${error.message}`);
  }
}

/**
 * Check if record exists
 * @param {string} table - Table name
 * @param {string} column - Column to check
 * @param {*} value - Value to search for
 * @returns {Promise<boolean>} True if exists
 */
async function dbExists(table, column, value) {
  const count = await dbCount(table, { [column]: value });
  return count > 0;
}

/**
 * Insert new record (limited - registry, custom data only)
 * @param {string} table - Table name
 * @param {object} data - Record data
 * @returns {Promise<Object>} Created record
 */
async function dbInsert(table, data) {
  try {
    if (table !== 'registry') {
      throw new Error('Insert only allowed on registry table');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO "${table}" (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[dbInsert]', error);
    throw new Error(`Insert failed: ${error.message}`);
  }
}

/**
 * Update existing record (limited - registry only)
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @param {object} data - Fields to update
 * @returns {Promise<Object>} Updated record
 */
async function dbUpdate(table, id, data) {
  try {
    if (table !== 'registry') {
      throw new Error('Update only allowed on registry table');
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [column, value] of Object.entries(data)) {
      updates.push(`${column} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const query = `
      UPDATE "${table}"
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[dbUpdate]', error);
    throw new Error(`Update failed: ${error.message}`);
  }
}

/**
 * Delete record (limited - registry only)
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @returns {Promise<boolean>} Success status
 */
async function dbDelete(table, id) {
  try {
    if (table !== 'registry') {
      throw new Error('Delete only allowed on registry table');
    }

    await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    return true;
  } catch (error) {
    console.error('[dbDelete]', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * REGISTRY FUNCTIONS
 */

/**
 * Get registry entry by key and type
 * @param {string} key - Registry key
 * @param {string} type - Entry type (channel, role, user, server, custom)
 * @returns {Promise<Object|null>} Registry entry or null
 */
async function regGet(key, type = null) {
  try {
    let query = 'SELECT * FROM registry WHERE key = $1';
    const params = [key];
    let paramCount = 2;

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[regGet]', error);
    return null;
  }
}

/**
 * Get all registry entries of a type
 * @param {string} type - Entry type
 * @returns {Promise<Array>} Array of registry entries
 */
async function regGetAll(type) {
  try {
    const result = await pool.query(
      'SELECT * FROM registry WHERE type = $1 ORDER BY key ASC',
      [type]
    );
    return result.rows;
  } catch (error) {
    console.error('[regGetAll]', error);
    return [];
  }
}

/**
 * Create or update registry entry
 * @param {string} key - Registry key
 * @param {string} type - Entry type
 * @param {string} value - Entry value
 * @param {string} description - Optional description
 * @returns {Promise<Object>} Created/updated entry
 */
async function regSet(key, type, value, description = '') {
  try {
    const existing = await regGet(key, type);

    if (existing) {
      const result = await pool.query(
        `UPDATE registry SET value = $1, description = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *;`,
        [value, description, existing.id]
      );
      return result.rows[0];
    } else {
      const result = await pool.query(
        `INSERT INTO registry (type, key, value, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *;`,
        [type, key, value, description]
      );
      return result.rows[0];
    }
  } catch (error) {
    console.error('[regSet]', error);
    throw new Error(`Registry set failed: ${error.message}`);
  }
}

/**
 * Delete registry entry
 * @param {string} key - Registry key
 * @param {string} type - Entry type
 * @returns {Promise<boolean>} Success status
 */
async function regDelete(key, type) {
  try {
    await pool.query(
      'DELETE FROM registry WHERE key = $1 AND type = $2',
      [key, type]
    );
    return true;
  } catch (error) {
    console.error('[regDelete]', error);
    return false;
  }
}

/**
 * USER & ROLE FUNCTIONS
 */

/**
 * Get user data
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} User record or null
 */
async function getUser(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE discord_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[getUser]', error);
    return null;
  }
}

/**
 * Get user's QFT roles
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} Array of role objects
 */
async function getUserRoles(userId) {
  try {
    const result = await pool.query(
      `SELECT r.* FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_discord_id = $1
       ORDER BY CASE r.clearance_level
         WHEN 'α' THEN 1 WHEN 'Ω' THEN 2 WHEN '3' THEN 3
         WHEN '2' THEN 4 WHEN '1' THEN 5 ELSE 6 END`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('[getUserRoles]', error);
    return [];
  }
}

/**
 * Get user's highest clearance role
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} Highest role or null
 */
async function getUserHighestRole(userId) {
  const roles = await getUserRoles(userId);
  return roles.length > 0 ? roles[0] : null;
}

/**
 * Check if user has specific role
 * @param {string} userId - Discord user ID
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if user has role
 */
async function hasRole(userId, roleId) {
  try {
    const result = await pool.query(
      `SELECT 1 FROM user_roles WHERE user_discord_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[hasRole]', error);
    return false;
  }
}

/**
 * Check if user has specific permission
 * @param {string} userId - Discord user ID
 * @param {string} permissionKey - Permission key to check
 * @returns {Promise<boolean>} True if user has permission
 */
async function checkPermission(userId, permissionKey) {
  try {
    const result = await pool.query(
      `SELECT 1 FROM role_permissions rp
       JOIN user_roles ur ON rp.role_id = ur.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_discord_id = $1 AND p.permission_key = $2 AND rp.enabled = true`,
      [userId, permissionKey]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[checkPermission]', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} Array of permission keys
 */
async function getUserPermissions(userId) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.permission_key FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_discord_id = $1 AND rp.enabled = true`,
      [userId]
    );
    return result.rows.map(r => r.permission_key);
  } catch (error) {
    console.error('[getUserPermissions]', error);
    return [];
  }
}

/**
 * BOT FILTERING FUNCTIONS
 */

/**
 * Check if user is a bot
 * @param {string} userId - Discord user ID
 * @returns {boolean} True if bot user
 */
function isBotUser(userId) {
  // Simple check - bots often have patterns or we can maintain a list
  // For now, check against known bot user IDs or patterns
  const botUserIds = [];
  return botUserIds.includes(userId);
}

/**
 * Filter bots from user list
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Array<string>} Filtered user IDs without bots
 */
function filterBots(userIds = []) {
  if (!Array.isArray(userIds)) return [];
  return userIds.filter(id => !isBotUser(id));
}

/**
 * Validate user exists in system
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>} True if user exists
 */
async function validateUser(userId) {
  return await dbExists('users', 'discord_id', userId);
}

/**
 * Validate role exists
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if role exists
 */
async function validateRole(roleId) {
  return await dbExists('roles', 'id', roleId);
}

/**
 * MODULE FUNCTIONS
 */

/**
 * Get module configuration
 * @param {number} moduleId - Module ID
 * @returns {Promise<Object|null>} Module object or null
 */
async function moduleGet(moduleId) {
  try {
    const result = await pool.query(
      'SELECT * FROM page_modules WHERE id = $1',
      [moduleId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[moduleGet]', error);
    return null;
  }
}

/**
 * Get all modules for a page
 * @param {number} pageId - Page ID
 * @returns {Promise<Array>} Array of modules
 */
async function moduleList(pageId) {
  try {
    const result = await pool.query(
      `SELECT pm.* FROM page_modules pm
       JOIN page_categories pc ON pm.category_id = pc.id
       WHERE pc.page_id = $1
       ORDER BY pm.display_order ASC`,
      [pageId]
    );
    return result.rows;
  } catch (error) {
    console.error('[moduleList]', error);
    return [];
  }
}

/**
 * MODULE EXPORTS
 */
module.exports = {
  // Database Query Functions
  dbQuery,
  dbFetch,
  dbCount,
  dbExists,
  dbInsert,
  dbUpdate,
  dbDelete,

  // Registry Functions
  regGet,
  regGetAll,
  regSet,
  regDelete,

  // User & Role Functions
  getUser,
  getUserRoles,
  getUserHighestRole,
  hasRole,
  checkPermission,
  getUserPermissions,

  // Bot Filtering
  isBotUser,
  filterBots,
  validateUser,
  validateRole,

  // Module Functions
  moduleGet,
  moduleList,

  // Constants for consumers
  ALLOWED_TABLES,
  READONLY_TABLES,
  MAX_ROWS,
  QUERY_TIMEOUT
};
