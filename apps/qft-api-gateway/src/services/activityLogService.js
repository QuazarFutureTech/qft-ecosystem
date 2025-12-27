// qft-api-gateway/src/services/activityLogService.js
// Service for logging user activities

const db = require('../db');

// Log an activity
const logActivity = async (logData) => {
  const {
    userId,
    username,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent
  } = logData;

  const query = `
    INSERT INTO activity_logs (
      user_discord_id,
      username,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const result = await db.query(query, [
    userId,
    username,
    action,
    resourceType || null,
    resourceId || null,
    details ? JSON.stringify(details) : null,
    ipAddress || null,
    userAgent || null
  ]);

  return result.rows[0];
};

// Get activity logs with filters
const getActivityLogs = async (filters = {}) => {
  const {
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = filters;

  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (userId) {
    whereConditions.push(`user_discord_id = $${paramIndex}`);
    params.push(userId);
    paramIndex++;
  }

  if (action) {
    whereConditions.push(`action = $${paramIndex}`);
    params.push(action);
    paramIndex++;
  }

  if (resourceType) {
    whereConditions.push(`resource_type = $${paramIndex}`);
    params.push(resourceType);
    paramIndex++;
  }

  if (startDate) {
    whereConditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereConditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : '';

  const query = `
    SELECT * FROM activity_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  params.push(limit, offset);

  const result = await db.query(query, params);
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total FROM activity_logs
    ${whereClause};
  `;
  
  const countResult = await db.query(countQuery, params.slice(0, -2));

  return {
    logs: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit,
    offset
  };
};

// Get activity log statistics
const getActivityStats = async (days = 7) => {
  // Ensure days is a valid positive number
  const validDays = (typeof days === 'number' && !isNaN(days) && days > 0) ? days : 7;
  
  const query = `
    SELECT 
      action,
      COUNT(*) as count,
      COUNT(DISTINCT user_discord_id) as unique_users
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL '${validDays} days'
    GROUP BY action
    ORDER BY count DESC;
  `;

  const result = await db.query(query);
  return result.rows;
};

// Get recent activity for a user
const getUserRecentActivity = async (userId, limit = 20) => {
  const query = `
    SELECT * FROM activity_logs
    WHERE user_discord_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;

  const result = await db.query(query, [userId, limit]);
  return result.rows;
};

module.exports = {
  logActivity,
  getActivityLogs,
  getActivityStats,
  getUserRecentActivity,
};
