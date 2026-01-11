// qft-api-gateway/src/routes/moduleSettings.js
// Module enable/disable endpoints

const express = require('express');
const moduleSettingsService = require('../services/moduleSettingsService');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Middleware to allow either internal secret (bot) or authenticated dashboard user
const authorize = async (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret && secret === process.env.INTERNAL_BOT_SECRET) {
    req.user = { qft_role: 'system' };
    return next();
  }

  // Fallback to bearer auth for dashboard users
  return authenticateToken(req, res, next);
};

/**
 * GET /api/v1/guilds/:guildId/modules
 * Get all module settings for a guild
 */
router.get('/guilds/:guildId/modules', authorize, async (req, res) => {
  try {
    const { guildId } = req.params;
    const modules = await moduleSettingsService.getModuleSettings(guildId);
    res.json({ guildId, modules });
  } catch (error) {
    console.error('[ModuleSettings] Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch module settings' });
  }
});

/**
 * GET /api/v1/guilds/:guildId/modules/:moduleName
 * Check if a specific module is enabled
 */
router.get('/guilds/:guildId/modules/:moduleName', authorize, async (req, res) => {
  try {
    const { guildId, moduleName } = req.params;
    const enabled = await moduleSettingsService.isModuleEnabled(guildId, moduleName);
    res.json({ guildId, moduleName, enabled });
  } catch (error) {
    console.error('[ModuleSettings] Error checking module:', error);
    res.status(500).json({ error: 'Failed to check module status' });
  }
});

/**
 * POST /api/v1/guilds/:guildId/modules/:moduleName/toggle
 * Toggle a module on/off
 */
router.post('/guilds/:guildId/modules/:moduleName/toggle', authorize, async (req, res) => {
  try {
    const { guildId, moduleName } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const result = await moduleSettingsService.toggleModule(guildId, moduleName, enabled);
    res.json({ success: true, guildId, moduleName, enabled, modules: result });
  } catch (error) {
    console.error('[ModuleSettings] Error toggling module:', error);
    res.status(400).json({ error: error.message || 'Failed to toggle module' });
  }
});

/**
 * POST /api/v1/guilds/:guildId/modules/batch
 * Set multiple module settings at once
 */
router.post('/guilds/:guildId/modules/batch', authorize, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { modules } = req.body;

    if (!modules || typeof modules !== 'object') {
      return res.status(400).json({ error: 'modules must be an object' });
    }

    const result = await moduleSettingsService.setModuleSettings(guildId, modules);
    res.json({ success: true, guildId, modules: result });
  } catch (error) {
    console.error('[ModuleSettings] Error setting modules:', error);
    res.status(400).json({ error: error.message || 'Failed to set module settings' });
  }
});

module.exports = router;
