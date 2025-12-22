/**
 * Role-Based Access Control Middleware
 * 
 * This middleware checks if the authenticated user has the required role(s)
 * to access a particular route.
 * 
 * Usage:
 *   router.get('/admin/users', rbacMiddleware('admin'), userController);
 *   router.post('/staff/tickets', rbacMiddleware(['admin', 'staff']), ticketController);
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

/**
 * Master Admin Discord IDs - These users bypass ALL role checks
 * Add your Discord ID here for immediate superadmin access
 */
const MASTER_ADMINS = (process.env.MASTER_ADMIN_IDS || '').split(',').filter(Boolean);

/**
 * RBAC Middleware Factory
 * @param {string|string[]} allowedRoles - Role name(s) that can access this route
 * @returns {Function} Express middleware function
 */
function rbacMiddleware(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.discord_id) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      const discordId = req.user.discord_id;

      // 🔥 MASTER ADMIN OVERRIDE - Bypass all role checks
      if (MASTER_ADMINS.includes(discordId)) {
        req.userRoles = [{ role_name: 'Master Admin', clearance_level: 'α' }];
        req.highestClearance = 'α';
        req.isMasterAdmin = true;
        return next();
      }

      // Get user's roles from database
      const userRoles = await pool.query(
        `SELECT r.name AS role_name, r.clearance_level 
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_discord_id = $1
         ORDER BY r.clearance_level DESC`,
        [discordId]
      );

      if (!userRoles.rows || userRoles.rows.length === 0) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have the required permissions to access this resource'
        });
      }

      // Extract role names
      const userRoleNames = userRoles.rows.map(r => r.role_name?.toLowerCase()).filter(Boolean);

      // Check if user has any of the allowed roles
      const hasPermission = roles.some(role => 
        userRoleNames.includes(role.toLowerCase())
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This resource requires one of the following roles: ${roles.join(', ')}`,
          required: roles,
          current: userRoleNames
        });
      }

      // Attach user roles to request for use in route handlers
      req.userRoles = userRoles.rows;
      req.highestClearance = userRoles.rows[0].clearance_level;

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      return res.status(500).json({
        error: 'Authorization check failed',
        message: 'An error occurred while verifying your permissions'
      });
    }
  };
}

/**
 * Clearance Level Middleware
 * Check if user has a minimum clearance level
 * @param {number|string} minLevel - Minimum clearance level (0, 1, 2, 3, 'Ω', 'α')
 */
function clearanceMiddleware(minLevel) {
  const clearanceOrder = {
    'α': 100,  // Owner
    'Ω': 90,   // Executive
    '3': 3,    // Management
    '2': 2,    // Security
    '1': 1,    // IT Staff
    '0': 0     // Staff
  };

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.discord_id) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // 🔥 MASTER ADMIN OVERRIDE
      if (MASTER_ADMINS.includes(req.user.discord_id)) {
        req.userClearance = 'α';
        return next();
      }

      const userRoles = await pool.query(
        `SELECT r.clearance_level 
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_discord_id = $1
         ORDER BY r.clearance_level DESC
         LIMIT 1`,
        [req.user.discord_id]
      );

      if (!userRoles.rows || userRoles.rows.length === 0) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'No clearance level assigned'
        });
      }

      const userClearance = userRoles.rows[0].clearance_level;
      const requiredClearance = clearanceOrder[String(minLevel)];
      const actualClearance = clearanceOrder[userClearance];

      if (actualClearance < requiredClearance) {
        return res.status(403).json({
          error: 'Insufficient clearance',
          message: `This resource requires clearance level ${minLevel} or higher`,
          required: minLevel,
          current: userClearance
        });
      }

      req.userClearance = userClearance;
      next();
    } catch (error) {
      console.error('Clearance Middleware Error:', error);
      return res.status(500).json({
        error: 'Authorization check failed'
      });
    }
  };
}

/**
 * Permission Check Middleware
 * Check if user has a specific permission key
 * @param {string} permissionKey - Permission key to check (e.g., 'manage_roles', 'view_logs')
 */
function permissionMiddleware(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.discord_id) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // 🔥 MASTER ADMIN OVERRIDE
      if (MASTER_ADMINS.includes(req.user.discord_id)) {
        return next();
      }

      // Check if user has the permission through any of their roles
      const hasPermission = await pool.query(
        `SELECT EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_discord_id = $1
          AND p.permission_key = $2
          AND rp.granted = true
        ) AS has_permission`,
        [req.user.discord_id, permissionKey]
      );

      if (!hasPermission.rows[0].has_permission) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This action requires the '${permissionKey}' permission`,
          required: permissionKey
        });
      }

      next();
    } catch (error) {
      console.error('Permission Middleware Error:', error);
      return res.status(500).json({
        error: 'Authorization check failed'
      });
    }
  };
}

module.exports = {
  rbacMiddleware,
  clearanceMiddleware,
  permissionMiddleware
};
