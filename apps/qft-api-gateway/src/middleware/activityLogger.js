// qft-api-gateway/src/middleware/activityLogger.js
// Middleware to automatically log user activities

const activityLogService = require('../services/activityLogService');

// Activity logger middleware
const activityLogger = (action, resourceType = null) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to log after response
    res.send = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          userId: req.user?.discord_id || null,
          username: req.user?.username || 'Anonymous',
          action,
          resourceType,
          resourceId: req.params.id || req.params.guildId || req.params.commandId || null,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        };

        // Log asynchronously without waiting
        activityLogService.logActivity(logData).catch(err => {
          console.error('Failed to log activity:', err);
        });
      }
      
      // Call original send
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Helper to log custom activities manually
const logCustomActivity = async (req, action, resourceType, resourceId, details = {}) => {
  try {
    await activityLogService.logActivity({
      userId: req.user?.discord_id || null,
      username: req.user?.username || 'Anonymous',
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  } catch (error) {
    console.error('Failed to log custom activity:', error);
  }
};

module.exports = {
  activityLogger,
  logCustomActivity,
};
