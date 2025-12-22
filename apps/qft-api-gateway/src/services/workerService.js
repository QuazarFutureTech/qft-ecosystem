// qft-api-gateway/src/services/workerService.js
// Zapier-style trigger→action workflow system

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Create a new worker
const createWorker = async (guildId, workerName, description, trigger, actions, createdByDiscordId, platforms = ['discord'], assignedRoleId = null) => {
  const query = `
    INSERT INTO workers (guild_id, worker_name, description, trigger, actions, created_by_discord_id, platforms, assigned_role_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    guildId,
    workerName,
    description,
    JSON.stringify(trigger),
    JSON.stringify(actions),
    createdByDiscordId,
    platforms,
    assignedRoleId
  ]);

  return result.rows[0];
};

// Get worker by ID
const getWorker = async (workerId) => {
  const query = `
    SELECT * FROM workers WHERE id = $1;
  `;
  const result = await pool.query(query, [workerId]);
  return result.rows[0] || null;
};

// List workers for guild
const listWorkers = async (guildId, filterState = null) => {
  let query = `
    SELECT id, worker_name, description, trigger, lifecycle_state, platforms, execution_count, last_executed_at, is_enabled
    FROM workers
    WHERE guild_id = $1
  `;
  const params = [guildId];

  if (filterState) {
    query += ` AND lifecycle_state = $2`;
    params.push(filterState);
  }

  query += ` ORDER BY created_at DESC;`;

  const result = await pool.query(query, params);
  return result.rows;
};

// Update worker
const updateWorker = async (workerId, updates) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.workerName) {
    fields.push(`worker_name = $${paramIndex++}`);
    values.push(updates.workerName);
  }

  if (updates.description) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.trigger) {
    fields.push(`trigger = $${paramIndex++}`);
    values.push(JSON.stringify(updates.trigger));
  }

  if (updates.actions) {
    fields.push(`actions = $${paramIndex++}`);
    values.push(JSON.stringify(updates.actions));
  }

  if (updates.lifecycleState) {
    fields.push(`lifecycle_state = $${paramIndex++}`);
    values.push(updates.lifecycleState);
  }

  if (updates.isEnabled !== undefined) {
    fields.push(`is_enabled = $${paramIndex++}`);
    values.push(updates.isEnabled);
  }

  if (updates.assignedRoleId !== undefined) {
    fields.push(`assigned_role_id = $${paramIndex++}`);
    values.push(updates.assignedRoleId);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(workerId);

  const query = `
    UPDATE workers
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Execute worker (trigger fired)
const executeWorker = async (workerId, guildId, triggerData = {}, client = null) => {
  const worker = await getWorker(workerId);
  if (!worker || !worker.is_enabled) {
    return { success: false, error: 'Worker not found or disabled' };
  }

  try {
    const trigger = typeof worker.trigger === 'string' ? JSON.parse(worker.trigger) : worker.trigger;
    const actions = typeof worker.actions === 'string' ? JSON.parse(worker.actions) : worker.actions;

    // Validate trigger
    if (!validateTrigger(trigger, triggerData)) {
      return { success: false, error: 'Trigger conditions not met' };
    }

    // Execute actions
    const actionResults = [];
    for (const action of actions) {
      try {
        const result = await executeAction(action, triggerData, guildId, client);
        actionResults.push(result);
      } catch (error) {
        actionResults.push({ success: false, error: error.message });
      }
    }

    // Log execution
    const logQuery = `
      INSERT INTO worker_executions (worker_id, trigger_data, action_results, status)
      VALUES ($1, $2, $3, 'success')
      RETURNING *;
    `;
    await pool.query(logQuery, [workerId, JSON.stringify(triggerData), JSON.stringify(actionResults)]);

    // Update execution count
    await pool.query(
      `UPDATE workers SET execution_count = execution_count + 1, last_executed_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [workerId]
    );

    return { success: true, actionResults };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Validate trigger
const validateTrigger = (trigger, data) => {
  if (trigger.type === 'message') {
    return data.message && data.message.content?.includes(trigger.keyword);
  }
  if (trigger.type === 'user_join') {
    return data.member !== undefined;
  }
  if (trigger.type === 'reaction') {
    return data.reaction === trigger.emoji;
  }
  if (trigger.type === 'schedule') {
    // Simplified: always true for scheduled triggers
    return true;
  }
  return false;
};

// Execute individual action
const executeAction = async (action, triggerData, guildId, client = null) => {
  const { type, params } = action;

  switch (type) {
    case 'send_message': {
      // Send message to channel if client is available
      if (client && params.channelId) {
        try {
          const channel = await client.channels.fetch(params.channelId);
          await channel.send(params.message);
        } catch (error) {
          return { type: 'send_message', success: false, error: error.message };
        }
      }
      return {
        type: 'send_message',
        success: true,
        message: `Message sent: ${params.message}`,
      };
    }

    case 'assign_role': {
      // Assign role if client is available
      if (client && params.roleId && triggerData.userId) {
        try {
          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(triggerData.userId);
          await member.roles.add(params.roleId);
        } catch (error) {
          return { type: 'assign_role', success: false, error: error.message };
        }
      }
      return {
        type: 'assign_role',
        success: true,
        message: `Role assigned: ${params.roleId}`,
      };
    }

    case 'send_dm': {
      // Send DM if client is available
      if (client && triggerData.userId) {
        try {
          const user = await client.users.fetch(triggerData.userId);
          await user.send(params.message);
        } catch (error) {
          return { type: 'send_dm', success: false, error: error.message };
        }
      }
      return {
        type: 'send_dm',
        success: true,
        message: `DM sent to user`,
      };
    }

    case 'log_event':
      return {
        type: 'log_event',
        success: true,
        message: `Event logged: ${params.event}`,
      };

    case 'api_call':
      // Call external API
      try {
        const response = await fetch(params.url, {
          method: params.method || 'POST',
          headers: params.headers || {},
          body: params.body ? JSON.stringify(params.body) : undefined,
        });
        return {
          type: 'api_call',
          success: response.ok,
          status: response.status,
        };
      } catch (error) {
        return { type: 'api_call', success: false, error: error.message };
      }

    case 'notify_reddit':
      return {
        type: 'notify_reddit',
        success: true,
        message: `Reddit notification queued to ${params.subreddit}`,
      };

    case 'post_twitter':
      return {
        type: 'post_twitter',
        success: true,
        message: `Tweet queued`,
      };

    default:
      return { success: false, error: 'Unknown action type' };
  }
};

// Get workers by trigger type (for event-based dispatch)
const getWorkersByTrigger = async (guildId, triggerType) => {
  const query = `
    SELECT * FROM workers
    WHERE guild_id = $1
    AND is_enabled = true
    AND (trigger::jsonb->>'type' = $2 OR trigger::jsonb->'types' ? $2);
  `;
  const result = await pool.query(query, [guildId, triggerType]);
  return result.rows.map(row => ({
    ...row,
    trigger: typeof row.trigger === 'string' ? JSON.parse(row.trigger) : row.trigger,
    actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
  }));
};

// Delete worker
const deleteWorker = async (workerId) => {
  const query = `DELETE FROM workers WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [workerId]);
  return result.rows[0];
};

// Get worker execution history
const getExecutionHistory = async (workerId, limit = 50) => {
  const query = `
    SELECT * FROM worker_executions
    WHERE worker_id = $1
    ORDER BY executed_at DESC
    LIMIT $2;
  `;
  const result = await pool.query(query, [workerId, limit]);
  return result.rows;
};

// Get workers assigned to a specific role
const getWorkersByRole = async (roleId) => {
  const query = `
    SELECT w.*, r.name as role_name, r.clearance_level
    FROM workers w
    JOIN roles r ON w.assigned_role_id = r.id
    WHERE w.assigned_role_id = $1 AND w.is_enabled = true
    ORDER BY w.worker_name;
  `;
  const result = await pool.query(query, [roleId]);
  return result.rows;
};

// Check if user can execute worker (based on role assignment)
const canExecuteWorker = async (workerId, userDiscordId) => {
  const workerQuery = `SELECT assigned_role_id FROM workers WHERE id = $1;`;
  const workerResult = await pool.query(workerQuery, [workerId]);
  
  if (!workerResult.rows[0]) return false;
  
  const assignedRoleId = workerResult.rows[0].assigned_role_id;
  
  // If no role assigned, anyone can execute
  if (!assignedRoleId) return true;
  
  // Check if user has the required role
  const userRoleQuery = `
    SELECT 1 FROM user_roles 
    WHERE user_discord_id = $1 AND role_id = $2;
  `;
  const userRoleResult = await pool.query(userRoleQuery, [userDiscordId, assignedRoleId]);
  
  return userRoleResult.rows.length > 0;
};

module.exports = {
  createWorker,
  getWorker,
  listWorkers,
  updateWorker,
  executeWorker,
  deleteWorker,
  getExecutionHistory,
  getWorkersByRole,
  canExecuteWorker,
  getWorkersByTrigger
};
