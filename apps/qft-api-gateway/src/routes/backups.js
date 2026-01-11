// apps/qft-api-gateway/src/routes/backups.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const authenticateToken = require('../middleware/auth');

const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002';

router.use(authenticateToken);

// GET backups for a guild
router.get('/guilds/:guildId/backups', async (req, res) => {
  const { guildId } = req.params;
  if (!INTERNAL_BOT_SECRET) {
    return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
  }
  try {
    const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/backups`, {
      method: 'GET',
      headers: {
        'internal-secret': INTERNAL_BOT_SECRET,
      },
    });
    const responseData = await botAgentResponse.json();
    if (!botAgentResponse.ok) {
      return res.status(botAgentResponse.status).json(responseData);
    }
    res.json(responseData);
  } catch (error) {
    console.error(`[API Gateway] Error fetching backups for guild ${guildId} from bot agent:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch backups from bot agent.' });
  }
});

// POST create a new backup for a guild
router.post('/guilds/:guildId/backups', async (req, res) => {
  const { guildId } = req.params;
  if (!INTERNAL_BOT_SECRET) {
    return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
  }
  try {
    const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/backups`, {
      method: 'POST',
      headers: {
        'internal-secret': INTERNAL_BOT_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const responseData = await botAgentResponse.json();
    if (!botAgentResponse.ok) {
      return res.status(botAgentResponse.status).json(responseData);
    }
    res.json(responseData);
  } catch (error) {
    console.error(`[API Gateway] Error creating backup for guild ${guildId} via bot agent:`, error);
    res.status(500).json({ success: false, message: 'Failed to create backup via bot agent.' });
  }
});

module.exports = router;

// POST restore a backup for a guild
router.post('/guilds/:guildId/backups/restore', async (req, res) => {
  const { guildId } = req.params;
  if (!INTERNAL_BOT_SECRET) {
    return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
  }
  try {
    const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/backups`, {
      method: 'POST',
      headers: {
        'internal-secret': INTERNAL_BOT_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const responseData = await botAgentResponse.json();
    if (!botAgentResponse.ok) {
      return res.status(botAgentResponse.status).json(responseData);
    }
    res.json(responseData);
  } catch (error) {
    console.error(`[API Gateway] Error restoring backup for guild ${guildId} via bot agent:`, error);
    res.status(500).json({ success: false, message: 'Failed to restore backup via bot agent.' });
  }
});
