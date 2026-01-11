// qft-api-gateway/src/services/moduleSettingsService.js
// Manage per-guild module enable/disable settings

const db = require('../db');

// Default modules that can be toggled
const DEFAULT_MODULES = {
  commands: true,
  moderation: true,
  automod: true,
  logging: true,
  analytics: true,
  scheduler: true,
  tickets: true,
  webhooks: true,
  ai_integration: true,
};

/**
 * Get all module settings for a guild
 */
const getModuleSettings = async (guildId) => {
  const query = 'SELECT module_settings FROM guild_settings WHERE guild_id = $1';
  const result = await db.query(query, [guildId]);
  const settings = result.rows[0]?.module_settings || {};
  
  // Merge with defaults so new modules default to enabled
  return { ...DEFAULT_MODULES, ...settings };
};

/**
 * Check if a specific module is enabled for a guild
 */
const isModuleEnabled = async (guildId, moduleName) => {
  const settings = await getModuleSettings(guildId);
  return settings[moduleName] !== false; // Default to enabled
};

/**
 * Toggle a module on/off for a guild
 */
const toggleModule = async (guildId, moduleName, enabled) => {
  if (!DEFAULT_MODULES.hasOwnProperty(moduleName)) {
    throw new Error(`Unknown module: ${moduleName}`);
  }

  const query = `
    UPDATE guild_settings
    SET module_settings = jsonb_set(
      COALESCE(module_settings, '{}'::jsonb),
      ARRAY[$1],
      to_jsonb($2::boolean)
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE guild_id = $3
    RETURNING module_settings;
  `;

  try {
    const result = await db.query(query, [moduleName, enabled, guildId]);
    return result.rows[0]?.module_settings || {};
  } catch (error) {
    console.error('[moduleSettingsService] Error toggling module:', error);
    throw error;
  }
};

/**
 * Set multiple module settings at once
 */
const setModuleSettings = async (guildId, moduleUpdates) => {
  // Validate all modules exist
  Object.keys(moduleUpdates).forEach(mod => {
    if (!DEFAULT_MODULES.hasOwnProperty(mod)) {
      throw new Error(`Unknown module: ${mod}`);
    }
  });

  const query = `
    INSERT INTO guild_settings (guild_id, module_settings, updated_at)
    VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (guild_id)
    DO UPDATE SET module_settings = $2::jsonb, updated_at = CURRENT_TIMESTAMP
    RETURNING module_settings;
  `;

  try {
    const result = await db.query(query, [guildId, JSON.stringify(moduleUpdates)]);
    return result.rows[0]?.module_settings || {};
  } catch (error) {
    console.error('[moduleSettingsService] Error setting modules:', error);
    throw error;
  }
};

module.exports = {
  DEFAULT_MODULES,
  getModuleSettings,
  isModuleEnabled,
  toggleModule,
  setModuleSettings,
};
