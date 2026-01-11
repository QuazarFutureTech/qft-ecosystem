// qft-api-gateway/src/services/settingsService.js
// Guild settings service (command prefix, etc.)

const db = require('../db');

const getGuildSettings = async (guildId) => {
  const query = 'SELECT * FROM guild_settings WHERE guild_id = $1';
  const result = await db.query(query, [guildId]);
  return result.rows[0] || { guild_id: guildId, command_prefix: '?' };
};

const getCommandPrefix = async (guildId) => {
  const settings = await getGuildSettings(guildId);
  return settings.command_prefix || '?';
};

const setCommandPrefix = async (guildId, prefix) => {
  const query = `
    INSERT INTO guild_settings (guild_id, command_prefix, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (guild_id)
    DO UPDATE SET command_prefix = $2, updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, prefix]);
  return result.rows[0];
};

module.exports = {
  getGuildSettings,
  getCommandPrefix,
  setCommandPrefix,
};
