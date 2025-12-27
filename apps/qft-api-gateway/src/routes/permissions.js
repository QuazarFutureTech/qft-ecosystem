// qft-api-gateway/src/routes/permissions.js
// Routes for managing roles and permissions

const express = require('express');
const router = express.Router();
const permissionsService = require('../services/permissionsService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const { activityLogger } = require('../middleware/activityLogger');

const authenticateToken = require('../middleware/auth');

// Get all roles
router.get('/roles', authenticateToken, rbacMiddleware('admin'), async (req, res) => {
  try {
    const roles = await permissionsService.getAllRoles();
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all permissions
router.get('/permissions', authenticateToken, rbacMiddleware('admin'), async (req, res) => {
  try {
    const permissions = await permissionsService.getAllPermissions();
    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get permissions for a specific role
router.get('/roles/:roleId/permissions', authenticateToken, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const permissions = await permissionsService.getRolePermissions(roleId);
    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update role permissions
router.patch(
  '/roles/:roleId/permissions',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('update_role_permissions', 'role'),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;
      
      await permissionsService.updateRolePermissions(roleId, permissions);
      res.json({ success: true, message: 'Role permissions updated' });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new role
router.post(
  '/roles',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('create_role', 'role'),
  async (req, res) => {
    try {
      const { name, clearanceLevel, color, description } = req.body;
      const role = await permissionsService.createRole(name, clearanceLevel, color, description);
      res.json({ success: true, role });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update role
router.patch(
  '/roles/:roleId',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('update_role', 'role'),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const updates = req.body;
      
      const role = await permissionsService.updateRole(roleId, updates);
      res.json({ success: true, role });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete role
router.delete(
  '/roles/:roleId',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('delete_role', 'role'),
  async (req, res) => {
    try {
      const { roleId } = req.params;
      await permissionsService.deleteRole(roleId);
      res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Assign role to user
router.post(
  '/users/:userId/roles',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('assign_role', 'user'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      const assignedBy = req.user?.discord_id;
      
      await permissionsService.assignRoleToUser(userId, roleId, assignedBy);
      res.json({ success: true, message: 'Role assigned to user' });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Remove role from user
router.delete(
  '/users/:userId/roles/:roleId',
  authenticateToken,
  rbacMiddleware('admin'),
  activityLogger('remove_role', 'user'),
  async (req, res) => {
    try {
      const { userId, roleId } = req.params;
      await permissionsService.removeRoleFromUser(userId, roleId);
      res.json({ success: true, message: 'Role removed from user' });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all users
router.get('/users', authenticateToken, rbacMiddleware('admin'), async (req, res) => {
  try {
    const users = await permissionsService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user roles
router.get('/users/:userId/roles', authenticateToken, rbacMiddleware('staff'), async (req, res) => {
  try {
    const { userId } = req.params;
    const roles = await permissionsService.getUserRoles(userId);
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
