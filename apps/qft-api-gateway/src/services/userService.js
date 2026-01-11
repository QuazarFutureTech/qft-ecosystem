// apps/qft-api-gateway/src/services/userService.js
const db = require('../db');
const permissionsService = require('./permissionsService');

/**
 * Get user data by Discord ID
 * @param {string} discordId - Discord user ID
 * @returns {Promise<Object|null>} User record or null
 */
const getUser = async (discordId) => {
  const query = 'SELECT qft_uuid, discord_id, username, email, qft_role, created_at FROM users WHERE discord_id = $1';
  const result = await db.query(query, [discordId]);
  return result.rows[0] || null;
};

/**
 * Get user's QFT roles
 * This function already exists in permissionsService, so we'll just re-export/wrap it.
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} Array of role objects
 */
const getUserRoles = async (userId) => {
  return await permissionsService.getUserRoles(userId);
};

/**
 * Get user's highest clearance role
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object|null>} Highest role or null
 */
const getUserHighestRole = async (userId) => {
  const roles = await permissionsService.getUserRoles(userId);
  return roles.length > 0 ? roles[0] : null;
};

/**
 * Check if user has specific role
 * @param {string} userId - Discord user ID
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if user has role
 */
const hasRole = async (userId, roleId) => {
  const query = 'SELECT 1 FROM user_roles WHERE user_discord_id = $1 AND role_id = $2';
  const result = await db.query(query, [userId, roleId]);
  return result.rows.length > 0;
};

/**
 * Check if user has specific permission
 * @param {string} userId - Discord user ID
 * @param {string} permissionKey - Permission key to check
 * @returns {Promise<boolean>} True if user has permission
 */
const checkPermission = async (userId, permissionKey) => {
  // This logic is already within permissionsService.getUserPermissions
  const userPermissions = await permissionsService.getUserPermissions(userId);
  return userPermissions.includes(permissionKey);
};

/**
 * Get all permissions for a user
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array>} Array of permission keys
 */
const getUserPermissions = async (userId) => {
    const query = `
      SELECT DISTINCT p.permission_key FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_discord_id = $1 AND rp.enabled = true`;
    const result = await db.query(query, [userId]);
    return result.rows.map(r => r.permission_key);
};

/**
 * Validate user exists in system
 * @param {string} userId - Discord user ID
 * @returns {Promise<boolean>} True if user exists
 */
const validateUser = async (userId) => {
  const user = await getUser(userId);
  return !!user;
};

/**
 * Validate role exists
 * @param {number} roleId - Role ID
 * @returns {Promise<boolean>} True if role exists
 */
const validateRole = async (roleId) => {
  const query = 'SELECT 1 FROM roles WHERE id = $1';
  const result = await db.query(query, [roleId]);
  return result.rows.length > 0;
};

module.exports = {
  getUser,
  getUserRoles,
  getUserHighestRole,
  hasRole,
  checkPermission,
  getUserPermissions,
  validateUser,
  validateRole,
};