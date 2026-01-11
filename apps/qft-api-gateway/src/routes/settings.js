// qft-api-gateway/src/routes/settings.js
// Guild settings endpoints for dashboard

const express = require('express');
const settingsService = require('../services/settingsService');

const router = express.Router();

// Middleware to check for internal secret (for bot-to-gateway calls)
const checkInternalSecret = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_BOT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// GET /api/guilds/:guildId/settings - Get guild settings
router.get('/guilds/:guildId/settings', checkInternalSecret, async (req, res) => {
  try {
    const { guildId } = req.params;
    const settings = await settingsService.getGuildSettings(guildId);
    res.json(settings);
  } catch (error) {
    console.error('[SettingsRoute] Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/guilds/:guildId/settings/prefix - Update command prefix
router.post('/guilds/:guildId/settings/prefix', checkInternalSecret, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { prefix } = req.body;

    if (!prefix || typeof prefix !== 'string' || prefix.length > 5) {
      return res.status(400).json({ error: 'Prefix must be a string, 1-5 characters' });
    }

    const updated = await settingsService.setCommandPrefix(guildId, prefix);
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('[SettingsRoute] Error updating prefix:', error);
    res.status(500).json({ error: 'Failed to update prefix' });
  }
});

module.exports = router;
