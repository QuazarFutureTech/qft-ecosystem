// qft-api-gateway/src/services/logService.js
// Audit logging system with log channels and filtering

const db = require('../db');

// Log an action
const logAction = async (guildId, actionType, actorDiscordId, details = {}, targetDiscordId = null, targetId = null, client = null) => {
  const query = `
    INSERT INTO audit_logs (guild_id, action_type, actor_discord_id, target_discord_id, target_id, details)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, actionType, actorDiscordId, targetDiscordId, targetId, JSON.stringify(details)]);
  
  const log = result.rows[0];

  // Send to log channel
  await sendToLogChannel(guildId, actionType, log, client);

  return log;
};

// Setup or update log channel
const setupLogChannel = async (guildId, channelId, categories = ['moderation', 'tickets', 'workers'], client) => {
  const query = `
    INSERT INTO log_channels (guild_id, channel_id, log_categories)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id, channel_id)
    DO UPDATE SET log_categories = $3
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, channelId, categories]);

  // Verify channel exists, if not create
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      // Try to create if doesn't exist
      const guild = await client.guilds.fetch(guildId);
      const newChannel = await guild.channels.create({
        name: 'qft-logs',
        type: 'GUILD_TEXT',
        reason: 'QFT audit log channel',
      });
      const updateQuery = `UPDATE log_channels SET channel_id = $1 WHERE guild_id = $2;`;
      await db.query(updateQuery, [newChannel.id, guildId]);
      return newChannel.id;
    }
  } catch (error) {
    console.error('Error setting up log channel:', error);
  }

  return result.rows[0];
};

// Send log to Discord channel
const sendToLogChannel = async (guildId, actionType, log, client) => {
  if (!client) return;

  try {
    const query = `
      SELECT channel_id FROM log_channels
      WHERE guild_id = $1 AND is_active = true
      AND $2 = ANY(log_categories);
    `;
    const result = await db.query(query, [guildId, actionType]);
    
    if (result.rows.length === 0) return;

    const channel = await client.channels.fetch(result.rows[0].channel_id);
    if (!channel?.isSendable?.()) return;

    const embed = {
      title: `${actionType} Log`,
      description: JSON.stringify(log.details, null, 2),
      color: getColorForAction(actionType),
      fields: [
        { name: 'Actor', value: `<@${log.actor_discord_id}>`, inline: true },
        ...(log.target_discord_id ? [{ name: 'Target', value: `<@${log.target_discord_id}>`, inline: true }] : []),
        { name: 'Timestamp', value: new Date(log.created_at).toISOString(), inline: false },
      ],
    };

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending log to Discord:', error);
  }
};

// Get color for action type
const getColorForAction = (actionType) => {
  const colors = {
    moderation: 0xff4757,
    ticket: 0x00e0ff,
    worker: 0x2ecc71,
    backup: 0xffa502,
    command: 0x9b59b6,
  };
  return colors[actionType] || 0x95a5a6;
};

// Query logs with filters
const getLogs = async (guildId, filters = {}) => {
  let query = `
    SELECT * FROM audit_logs
    WHERE guild_id = $1
  `;
  const params = [guildId];

  if (filters.actionType) {
    query += ` AND action_type = $${params.length + 1}`;
    params.push(filters.actionType);
  }

  if (filters.actorDiscordId) {
    query += ` AND actor_discord_id = $${params.length + 1}`;
    params.push(filters.actorDiscordId);
  }

  if (filters.targetDiscordId) {
    query += ` AND target_discord_id = $${params.length + 1}`;
    params.push(filters.targetDiscordId);
  }

  if (filters.startDate) {
    query += ` AND created_at >= $${params.length + 1}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND created_at <= $${params.length + 1}`;
    params.push(filters.endDate);
  }

  query += ` ORDER BY created_at DESC LIMIT ${filters.limit || 100} OFFSET ${filters.offset || 0};`;

  const result = await db.query(query, params);
  return result.rows;
};

// Get log channel ID for a specific category
const getLogChannelId = async (guildId, category) => {
  const query = `
    SELECT channel_id FROM log_channels
    WHERE guild_id = $1 AND is_active = true
    AND $2 = ANY(log_categories)
    LIMIT 1;
  `;
  const result = await db.query(query, [guildId, category]);
  return result.rows.length > 0 ? result.rows[0].channel_id : null;
};

// Get log summary stats
const getLogStats = async (guildId, days = 7) => {
  const query = `
    SELECT 
      action_type,
      COUNT(*) as count
    FROM audit_logs
    WHERE guild_id = $1
    AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY action_type
    ORDER BY count DESC;
  `;
  const result = await db.query(query, [guildId]);
  return result.rows;
};

module.exports = {
  logAction,
  setupLogChannel,
  sendToLogChannel,
  getLogChannelId,
  getLogs,
  getLogStats,
};
