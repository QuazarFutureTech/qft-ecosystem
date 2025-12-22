// qft-api-gateway/src/routes/activityLogs.js
// Routes for activity logs

const express = require('express');
const router = express.Router();
const activityLogService = require('../services/activityLogService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');

// Get activity logs with filters
router.get('/', rbacMiddleware('admin'), async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : null,
      action: req.query.action,
      resourceType: req.query.resourceType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    const result = await activityLogService.getActivityLogs(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get activity statistics
router.get('/stats', rbacMiddleware('admin'), async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;
    // Ensure days is a valid number
    const validDays = isNaN(days) ? 7 : days;
    const stats = await activityLogService.getActivityStats(validDays);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's recent activity
router.get('/user/:userId', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    
    // Only allow users to view their own activity unless admin
    if (req.user.qft_role !== 'admin' && req.user.discord_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const logs = await activityLogService.getUserRecentActivity(userId, limit);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
