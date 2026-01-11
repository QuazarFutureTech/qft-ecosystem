// apps/qft-api-gateway/src/services/dbService.js
const db = require('../db');

/**
 * SAFETY CONFIGURATION - Must match qft-agent's templateEngineQftService.js
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

const MAX_ROWS = 100; // Max rows to return from a query for safety

/**
 * Execute a safe SELECT query with WHERE clause
 * @param {string} table - Table name (must be whitelisted)
 * @param {object} where - WHERE conditions as object { column: value }
 * @param {number} limit - Max rows to return (max 100)
 * @returns {Promise<Array>} Array of record objects
 */
const dbQuery = async (table, where = {}, limit = 100) => {
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
  const result = await db.query(query, params);
  
  return result.rows;
};

/**
 * Count rows matching criteria
 * @param {string} table - Table name
 * @param {object} where - WHERE conditions
 * @returns {Promise<number>} Row count
 */
const dbCount = async (table, where = {}) => {
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
  const result = await db.query(query, params);
  
  return parseInt(result.rows[0].count);
};

/**
 * Insert new record (limited to 'registry' table for template engine operations)
 * @param {string} table - Table name
 * @param {object} data - Record data
 * @returns {Promise<Object>} Created record
 */
const dbInsert = async (table, data) => {
  if (table !== 'registry') {
    throw new Error('Insert only allowed on "registry" table for template engine operations.');
  }

  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO "${table}" (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *;
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Update existing record (limited to 'registry' table for template engine operations)
 * @param {string} table - Table name
 * @param {number} id - Record ID
 *
 * @param {object} data - Fields to update
 * @returns {Promise<Object>} Updated record
 */
const dbUpdate = async (table, id, data) => {
  if (table !== 'registry') {
    throw new Error('Update only allowed on "registry" table for template engine operations.');
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

  const result = await db.query(query, values);
  return result.rows[0];
};

/**
 * Delete record (limited to 'registry' table for template engine operations)
 * @param {string} table - Table name
 * @param {number} id - Record ID
 * @returns {Promise<boolean>} Success status
 */
const dbDelete = async (table, id) => {
  if (table !== 'registry') {
    throw new Error('Delete only allowed on "registry" table for template engine operations.');
  }

  await db.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
  return true;
};


module.exports = {
  dbQuery,
  dbCount,
  dbInsert,
  dbUpdate,
  dbDelete,
  ALLOWED_TABLES, // Export for potential use in internal.js for validation
  MAX_ROWS
};
