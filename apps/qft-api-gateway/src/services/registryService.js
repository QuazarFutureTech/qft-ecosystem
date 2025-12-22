// Registry Service - Manage key-value pairs for channels, roles, users, servers
const db = require('../db');

// Get all registry entries (optionally filtered by type)
const getAllRegistryEntries = async (type = null) => {
  let query = `
    SELECT * FROM registry
    WHERE 1=1
  `;
  const params = [];
  
  if (type) {
    query += ` AND type = $1`;
    params.push(type);
  }
  
  query += ` ORDER BY type, key ASC`;
  
  const result = await db.query(query, params);
  return result.rows;
};

// Get a specific registry entry
const getRegistryEntry = async (key, type = null) => {
  let query = `SELECT * FROM registry WHERE key = $1`;
  const params = [key];
  
  if (type) {
    query += ` AND type = $2`;
    params.push(type);
  }
  
  const result = await db.query(query, params);
  return result.rows[0];
};

// Create a new registry entry
const createRegistryEntry = async (type, key, value, description = null, metadata = null) => {
  const query = `
    INSERT INTO registry (type, key, value, description, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  
  const result = await db.query(query, [type, key, value, description, metadata || {}]);
  return result.rows[0];
};

// Update a registry entry
const updateRegistryEntry = async (id, updates) => {
  const { value, description, metadata } = updates;
  
  const query = `
    UPDATE registry
    SET 
      value = COALESCE($1, value),
      description = COALESCE($2, description),
      metadata = COALESCE($3, metadata),
      updated_at = NOW()
    WHERE id = $4
    RETURNING *;
  `;
  
  const result = await db.query(query, [value, description, metadata, id]);
  return result.rows[0];
};

// Delete a registry entry
const deleteRegistryEntry = async (id) => {
  await db.query('DELETE FROM registry WHERE id = $1', [id]);
  return { success: true };
};

// Get registry entries by type
const getRegistryByType = async (type) => {
  const query = `
    SELECT * FROM registry
    WHERE type = $1
    ORDER BY key ASC;
  `;
  
  const result = await db.query(query, [type]);
  return result.rows;
};

// Search registry entries
const searchRegistry = async (searchTerm) => {
  const query = `
    SELECT * FROM registry
    WHERE 
      key ILIKE $1 OR
      value ILIKE $1 OR
      description ILIKE $1
    ORDER BY type, key ASC;
  `;
  
  const result = await db.query(query, [`%${searchTerm}%`]);
  return result.rows;
};

module.exports = {
  getAllRegistryEntries,
  getRegistryEntry,
  createRegistryEntry,
  updateRegistryEntry,
  deleteRegistryEntry,
  getRegistryByType,
  searchRegistry,
};

