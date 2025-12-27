// apps/qft-api-gateway/src/routes/guildConfig.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// In-memory placeholder for guild configs (replace with DB in production)
const guildConfigs = {};

// GET guild config
router.get('/guilds/:guildId/config', authenticateToken, async (req, res) => {
  const { guildId } = req.params;
  if (!guildConfigs[guildId]) {
    // Return a default config if not set
    guildConfigs[guildId] = { guildId, settings: {}, updatedAt: new Date() };
  }
  res.json(guildConfigs[guildId]);
});

// PUT guild config
router.put('/guilds/:guildId/config', authenticateToken, async (req, res) => {
  const { guildId } = req.params;
  const config = req.body;
  guildConfigs[guildId] = { ...config, guildId, updatedAt: new Date() };
  res.json({ success: true, config: guildConfigs[guildId] });
});

module.exports = router;
