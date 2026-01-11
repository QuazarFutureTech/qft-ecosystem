// apps/qft-agent/src/services/templateEngineQftService.js
// QFT System Integration for Template Engine (Agent-side with DB backing)
// Provides safe database, registry, user, and permission access from templates

const db = require('./db');

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

async function dbQuery(table, where = {}, limit = 100) {
  try {
    if (!ALLOWED_TABLES[table]) {
      throw new Error(`Table "${table}" not allowed. Allowed: ${Object.keys(ALLOWED_TABLES).join(', ')}`);
    }

    limit = Math.min(parseInt(limit) || 100, MAX_ROWS);

    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (Object.keys(where).length > 0) {
      const conditions = [];
      for (const [column, value] of Object.entries(where)) {
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

    const query = `SELECT * FROM ${table} ${whereClause} ${limitClause}`;
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[dbQuery]', error);
    throw new Error(`Database query failed: ${error.message}`);
  }
}

async function dbFetch(table, column, value) {
  const rows = await dbQuery(table, { [column]: value }, 1);
  return rows.length > 0 ? rows[0] : null;
}

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

    const query = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const result = await db.query(query, params);

    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('[dbCount]', error);
    throw new Error(`Count query failed: ${error.message}`);
  }
}

async function dbExists(table, column, value) {
  const count = await dbCount(table, { [column]: value });
  return count > 0;
}

async function dbInsert(table, data) {
  try {
    if (table !== 'registry') {
      throw new Error('Insert only allowed on registry table');
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[dbInsert]', error);
    throw new Error(`Insert failed: ${error.message}`);
  }
}

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
      UPDATE ${table}
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[dbUpdate]', error);
    throw new Error(`Update failed: ${error.message}`);
  }
}

async function dbDelete(table, id) {
  try {
    if (table !== 'registry') {
      throw new Error('Delete only allowed on registry table');
    }

    await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return true;
  } catch (error) {
    console.error('[dbDelete]', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * REGISTRY FUNCTIONS
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

    const result = await db.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[regGet]', error);
    return null;
  }
}

async function regGetAll(type) {
  try {
    const result = await db.query(
      'SELECT * FROM registry WHERE type = $1 ORDER BY key ASC',
      [type]
    );
    return result.rows;
  } catch (error) {
    console.error('[regGetAll]', error);
    return [];
  }
}

async function regSet(key, type, value, description = '') {
  try {
    const existing = await regGet(key, type);

    if (existing) {
      const result = await db.query(
        `UPDATE registry SET value = $1, description = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *;`,
        [value, description, existing.id]
      );
      return result.rows[0];
    } else {
      const result = await db.query(
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

async function regDelete(key, type) {
  try {
    await db.query(
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

async function getUser(userId) {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE discord_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[getUser]', error);
    return null;
  }
}

async function getUserRoles(userId) {
  try {
    const result = await db.query(
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

async function getUserHighestRole(userId) {
  const roles = await getUserRoles(userId);
  return roles.length > 0 ? roles[0] : null;
}

async function hasRole(userId, roleId) {
  try {
    const result = await db.query(
      `SELECT 1 FROM user_roles WHERE user_discord_id = $1 AND role_id = $2`,
      [userId, roleId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[hasRole]', error);
    return false;
  }
}

async function checkPermission(userId, permissionKey) {
  try {
    const result = await db.query(
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

async function getUserPermissions(userId) {
  try {
    const result = await db.query(
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

function isBotUser(userId) {
  const botUserIds = [];
  return botUserIds.includes(userId);
}

function filterBots(userIds = []) {
  if (!Array.isArray(userIds)) return [];
  return userIds.filter(id => !isBotUser(id));
}

async function validateUser(userId) {
  return await dbExists('users', 'discord_id', userId);
}

async function validateRole(roleId) {
  return await dbExists('roles', 'id', roleId);
}

/**
 * MODULE FUNCTIONS
 */

async function moduleGet(moduleId) {
  try {
    const result = await db.query(
      'SELECT * FROM page_modules WHERE id = $1',
      [moduleId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[moduleGet]', error);
    return null;
  }
}

async function moduleList(pageId) {
  try {
    const result = await db.query(
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
 * LEGACY DB HELPERS (for template compatibility)
 */

async function dbSet(key, value, guildId) {
  try {
    // Store in registry table with guild scope
    const type = guildId ? `guild:${guildId}` : 'global';
    await regSet(key, type, value);
    return true;
  } catch (error) {
    console.error('[dbSet]', error);
    return false;
  }
}

async function dbGet(key, guildId) {
  try {
    const type = guildId ? `guild:${guildId}` : 'global';
    const entry = await regGet(key, type);
    return entry ? entry.value : null;
  } catch (error) {
    console.error('[dbGet]', error);
    return null;
  }
}

async function dbDel(key, guildId) {
  try {
    const type = guildId ? `guild:${guildId}` : 'global';
    return await regDelete(key, type);
  } catch (error) {
    console.error('[dbDel]', error);
    return false;
  }
}

async function dbIncr(key, by = 1, guildId) {
  try {
    const current = Number(await dbGet(key, guildId) || 0);
    const next = current + Number(by || 1);
    await dbSet(key, next, guildId);
    return next;
  } catch (error) {
    console.error('[dbIncr]', error);
    return 0;
  }
}

async function dbTopEntries(limit = 10, guildId) {
  try {
    const type = guildId ? `guild:${guildId}` : 'global';
    const entries = await regGetAll(type);
    return entries
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, limit)
      .map(e => ({ key: e.key, value: e.value }));
  } catch (error) {
    console.error('[dbTopEntries]', error);
    return [];
  }
}

// Server-scoped helpers mirror guild-scoped for compatibility
async function dbGetServer(guildId, key) { return dbGet(key, guildId); }
async function dbSetServer(guildId, key, value) { return dbSet(key, value, guildId); }
async function dbDelServer(guildId, key) { return dbDel(key, guildId); }
async function dbIncrServer(guildId, key, by = 1) { return dbIncr(key, by, guildId); }
async function dbTopEntriesServer(guildId, limit = 10) { return dbTopEntries(limit, guildId); }

// Global helpers
async function dbGetGlobal(key) { return dbGet(key, null); }
async function dbSetGlobal(key, value) { return dbSet(key, value, null); }
async function dbDelGlobal(key) { return dbDel(key, null); }
async function dbIncrGlobal(key, by = 1) { return dbIncr(key, by, null); }
async function dbTopEntriesGlobal(limit = 10) { return dbTopEntries(limit, null); }

/**
 * GUILD CONFIG HELPERS
 */

async function getGuildConfig(guildId) {
  try {
    // Fetch all registry entries for this guild
    const type = `guild:${guildId}`;
    const entries = await regGetAll(type);
    const config = {};
    for (const entry of entries) {
      config[entry.key] = entry.value;
    }
    return config;
  } catch (error) {
    console.error('[getGuildConfig]', error);
    return {};
  }
}

async function getGuildConfigValue(guildId, key) {
  try {
    return await dbGet(key, guildId);
  } catch (error) {
    console.error('[getGuildConfigValue]', error);
    return null;
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

  // Legacy DB helpers for template compatibility
  dbSet,
  dbGet,
  dbDel,
  dbIncr,
  dbTopEntries,
  dbGetServer,
  dbSetServer,
  dbDelServer,
  dbIncrServer,
  dbTopEntriesServer,
  dbGetGlobal,
  dbSetGlobal,
  dbDelGlobal,
  dbIncrGlobal,
  dbTopEntriesGlobal,

  // Constants for consumers
  ALLOWED_TABLES,
  READONLY_TABLES,
  MAX_ROWS,
  QUERY_TIMEOUT
};

module.exports = {
  dbSet,
  dbGet,
  dbDel,
  dbIncr,
  dbTopEntries,
  dbGetServer,
  dbSetServer,
  dbDelServer,
  dbIncrServer,
  dbTopEntriesServer,
  dbGetGlobal,
  dbSetGlobal,
  dbDelGlobal,
  dbIncrGlobal,
  dbTopEntriesGlobal,
  regGet,
  regGetAll,
  regSet,
  regDelete,
  getUser,
  getUserRoles,
  getUserHighestRole,
  hasRole,
  checkPermission,
  validateUser,
  validateRole,
  getUserPermissions,
  getGuildConfig,
  getGuildConfigValue,
  moduleList,
};
