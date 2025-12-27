const db = require('../db');

/**
 * Database Management Service
 * Provides admin tools for viewing and managing database tables
 */

/**
 * Get list of all tables in the database
 * @returns {Promise<Array>} Array of table names with row counts
 */
async function getAllTables() {
  const query = `
    SELECT 
      table_name,
      (xpath('/row/count/text()', 
        query_to_xml(format('SELECT COUNT(*) AS count FROM %I', table_name), false, true, ''))
      )[1]::text::int AS row_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  const result = await db.query(query);
  return result.rows;
}

/**
 * Get table schema information
 * @param {string} tableName - Name of the table
 * @returns {Promise<Object>} Table schema details
 */
async function getTableSchema(tableName) {
  const query = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await db.query(query, [tableName]);
  return result.rows;
}

/**
 * Get sample data from a table
 * @param {string} tableName - Name of the table
 * @param {number} limit - Number of rows to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>} Sample data and total count
 */
async function getTableData(tableName, limit = 100, offset = 0) {
  // Validate table name to prevent SQL injection
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const tableCheck = await db.query(tableCheckQuery, [tableName]);
  if (!tableCheck.rows[0].exists) {
    throw new Error('Table does not exist');
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
  const countResult = await db.query(countQuery);
  const total = parseInt(countResult.rows[0].total);

  // Get data
  const dataQuery = `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`;
  const dataResult = await db.query(dataQuery, [limit, offset]);

  return {
    tableName,
    total,
    limit,
    offset,
    data: dataResult.rows
  };
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
  const sizeQuery = `
    SELECT 
      pg_database.datname as database_name,
      pg_size_pretty(pg_database_size(pg_database.datname)) as size
    FROM pg_database
    WHERE datname = current_database();
  `;
  
  const tableCountQuery = `
    SELECT COUNT(*) as table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  `;
  
  const totalRowsQuery = `
    SELECT 
      SUM((xpath('/row/count/text()', 
        query_to_xml(format('SELECT COUNT(*) AS count FROM %I', table_name), false, true, ''))
      )[1]::text::int) AS total_rows
    FROM information_schema.tables
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  `;

  const [sizeResult, tableCountResult, totalRowsResult] = await Promise.all([
    db.query(sizeQuery),
    db.query(tableCountQuery),
    db.query(totalRowsQuery)
  ]);

  return {
    databaseName: sizeResult.rows[0].database_name,
    size: sizeResult.rows[0].size,
    tableCount: parseInt(tableCountResult.rows[0].table_count),
    totalRows: parseInt(totalRowsResult.rows[0].total_rows || 0)
  };
}

/**
 * Delete a specific row from a table
 * @param {string} tableName - Name of the table
 * @param {string} primaryKeyColumn - Primary key column name
 * @param {any} primaryKeyValue - Value of primary key to delete
 * @returns {Promise<Object>} Result message
 */
async function deleteRow(tableName, primaryKeyColumn, primaryKeyValue) {
  // Validate table name
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const tableCheck = await db.query(tableCheckQuery, [tableName]);
  if (!tableCheck.rows[0].exists) {
    throw new Error('Table does not exist');
  }

  // Validate column exists
  const columnCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    );
  `;
  
  const columnCheck = await db.query(columnCheckQuery, [tableName, primaryKeyColumn]);
  if (!columnCheck.rows[0].exists) {
    throw new Error('Column does not exist');
  }

  // Delete the row
  const deleteQuery = `DELETE FROM "${tableName}" WHERE "${primaryKeyColumn}" = $1 RETURNING *`;
  const result = await db.query(deleteQuery, [primaryKeyValue]);

  if (result.rowCount === 0) {
    throw new Error('Row not found');
  }

  return {
    success: true,
    message: `Row deleted from ${tableName}`,
    deletedRow: result.rows[0]
  };
}

/**
 * Truncate a specific table (delete all rows)
 * @param {string} tableName - Name of the table to truncate
 * @param {boolean} cascade - Whether to cascade to dependent tables
 * @returns {Promise<Object>} Result message
 */
async function truncateTable(tableName) {
  // Validate table name
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const tableCheck = await db.query(tableCheckQuery, [tableName]);
  if (!tableCheck.rows[0].exists) {
    throw new Error('Table does not exist');
  }

  // Truncate with CASCADE to handle foreign key constraints
  const truncateQuery = `TRUNCATE TABLE "${tableName}" CASCADE`;
  await db.query(truncateQuery);

  return {
    success: true,
    message: `Table ${tableName} truncated successfully`,
    tableName
  };
}

/**
 * Purge entire database (truncate all tables)
 * WARNING: This is a destructive operation
 * @param {string} confirmationCode - Must be 'PURGE_DATABASE' to proceed
 * @returns {Promise<Object>} Result of purge operation
 */
async function purgeDatabase(confirmationCode) {
  if (confirmationCode !== 'PURGE_DATABASE') {
    throw new Error('Invalid confirmation code. Operation cancelled for safety.');
  }

  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get all table names
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const tableNames = tablesResult.rows.map(row => row.table_name);

    // Disable triggers temporarily
    await client.query('SET session_replication_role = replica;');

    // Truncate all tables
    for (const tableName of tableNames) {
      await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
    }

    // Re-enable triggers
    await client.query('SET session_replication_role = DEFAULT;');

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Database purged successfully',
      tablesPurged: tableNames.length,
      tables: tableNames
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a backup of table data (export to JSON)
 * @param {string} tableName - Name of the table to backup
 * @returns {Promise<Object>} Backup data
 */
async function backupTable(tableName) {
  // Validate table name
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const tableCheck = await db.query(tableCheckQuery, [tableName]);
  if (!tableCheck.rows[0].exists) {
    throw new Error('Table does not exist');
  }

  // Get schema
  const schema = await getTableSchema(tableName);

  // Get all data
  const dataQuery = `SELECT * FROM "${tableName}"`;
  const dataResult = await db.query(dataQuery);

  return {
    tableName,
    schema,
    rowCount: dataResult.rows.length,
    data: dataResult.rows,
    timestamp: new Date().toISOString()
  };
}

/**
 * Execute a custom SQL query (read-only for safety)
 * @param {string} query - SQL query to execute
 * @returns {Promise<Object>} Query result
 */
async function executeQuery(query) {
  // Only allow SELECT queries for safety
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed for safety');
  }

  const result = await db.query(query);
  
  return {
    rowCount: result.rowCount,
    rows: result.rows,
    fields: result.fields ? result.fields.map(f => f.name) : []
  };
}

module.exports = {
  getAllTables,
  getTableSchema,
  getTableData,
  getDatabaseStats,
  deleteRow,
  truncateTable,
  purgeDatabase,
  backupTable,
  executeQuery
};
