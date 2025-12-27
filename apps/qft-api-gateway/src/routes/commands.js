// apps/qft-api-gateway/src/routes/commands.js
const express = require('express');
const router = express.Router();
const commandService = require('../services/commandService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// Create or update a command for a guild
router.post('/guilds/:guildId/commands', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { commandName, commandCode, description, ...options } = req.body;
    const authorDiscordId = req.user?.discord_id;

    if (!commandName || !commandCode) {
      return res.status(400).json({ error: 'Command name and code are required' });
    }

    const command = await commandService.createCommand(guildId, commandName, commandCode, authorDiscordId, { description, ...options });
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List commands for a guild
router.get('/guilds/:guildId/commands', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const commands = await commandService.listCommands(guildId);
    res.json({ success: true, commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific command
router.get('/guilds/:guildId/commands/:commandName', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, commandName } = req.params;
    const command = await commandService.getCommand(guildId, commandName);
    if (!command) return res.status(404).json({ error: 'Command not found' });
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a command by its ID
router.put('/:commandId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { commandId } = req.params;
    const { commandCode, description, ...options } = req.body;
    const command = await commandService.updateCommand(commandId, commandCode, description, options);
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a command by its ID
router.delete('/:commandId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { commandId } = req.params;
    await commandService.deleteCommand(commandId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Refresh custom slash commands with Discord
router.post('/api/refresh-custom-commands', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.body;
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Guild ID is required.' });
    }

    await commandService.refreshCustomCommands(guildId);
    res.json({ success: true, message: 'Custom slash commands refreshed successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
