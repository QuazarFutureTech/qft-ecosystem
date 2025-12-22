// qft-api-gateway/src/services/permissionsService.js
// Service for managing roles and permissions

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Get all roles with member counts
const getAllRoles = async () => {
  const query = `
    SELECT 
      r.*,
      COUNT(DISTINCT ur.user_discord_id) as member_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role_id
    GROUP BY r.id
    ORDER BY 
      CASE r.clearance_level
        WHEN 'α' THEN 1
        WHEN 'Ω' THEN 2
        WHEN '3' THEN 3
        WHEN '2' THEN 4
        WHEN '1' THEN 5
        ELSE 6
      END,
      r.name;
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Get all permissions grouped by category
const getAllPermissions = async () => {
  const query = `
    SELECT * FROM permissions
    ORDER BY category, label;
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

// Get permissions for a specific role
const getRolePermissions = async (roleId) => {
  const query = `
    SELECT 
      p.*,
      COALESCE(rp.enabled, false) as enabled
    FROM permissions p
    LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role_id = $1
    ORDER BY p.category, p.label;
  `;
  
  const result = await pool.query(query, [roleId]);
  return result.rows;
};

// Update role permissions
const updateRolePermissions = async (roleId, permissions) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing permissions for this role
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
    
    // Insert new permissions
    for (const [permissionKey, enabled] of Object.entries(permissions)) {
      if (enabled) {
        const permResult = await client.query(
          'SELECT id FROM permissions WHERE permission_key = $1',
          [permissionKey]
        );
        
        if (permResult.rows.length > 0) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id, enabled) VALUES ($1, $2, $3)',
            [roleId, permResult.rows[0].id, true]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Create new role
const createRole = async (name, clearanceLevel, color, description) => {
  const query = `
    INSERT INTO roles (name, clearance_level, color, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  
  const result = await pool.query(query, [name, clearanceLevel, color, description]);
  return result.rows[0];
};

// Update role
const updateRole = async (roleId, updates) => {
  const { name, clearanceLevel, color, description } = updates;
  
  const query = `
    UPDATE roles
    SET 
      name = COALESCE($1, name),
      clearance_level = COALESCE($2, clearance_level),
      color = COALESCE($3, color),
      description = COALESCE($4, description),
      updated_at = NOW()
    WHERE id = $5
    RETURNING *;
  `;
  
  const result = await pool.query(query, [name, clearanceLevel, color, description, roleId]);
  return result.rows[0];
};

// Delete role
const deleteRole = async (roleId) => {
  await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);
  return { success: true };
};

// Assign role to user
const assignRoleToUser = async (userId, roleId, assignedBy) => {
  const query = `
    INSERT INTO user_roles (user_discord_id, role_id, assigned_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_discord_id, role_id) DO NOTHING
    RETURNING *;
  `;
  
  const result = await pool.query(query, [userId, roleId, assignedBy]);
  return result.rows[0];
};

// Remove role from user
const removeRoleFromUser = async (userId, roleId) => {
  await pool.query('DELETE FROM user_roles WHERE user_discord_id = $1 AND role_id = $2', [userId, roleId]);
  return { success: true };
};

// Get user roles
const getUserRoles = async (userId) => {
  const query = `
    SELECT r.*, ur.assigned_at
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_discord_id = $1
    ORDER BY 
      CASE r.clearance_level
        WHEN 'α' THEN 1
        WHEN 'Ω' THEN 2
        WHEN '3' THEN 3
        WHEN '2' THEN 4
        WHEN '1' THEN 5
        ELSE 6
      END;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Get all users
const getAllUsers = async () => {
  const query = `
    SELECT 
      discord_id,
      username,
      email,
      created_at
    FROM users
    ORDER BY username ASC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  getAllUsers,
};
