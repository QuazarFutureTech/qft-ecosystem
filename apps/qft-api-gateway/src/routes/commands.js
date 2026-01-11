
// apps/qft-api-gateway/src/routes/commands.js
const express = require('express');
const commandService = require('../services/commandService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');
const workerService = require('../services/workerService');
const router = express.Router();

// Minimal command lookup for agent: return trigger/response only
// GET /api/v1/command/:id
router.get('/command/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing command id' });
    const cmd = await commandService.getCommandById(id);
    if (!cmd) return res.status(404).json({ error: 'Command not found' });

    // Provide a minimal, un-parsed shape for the agent
    const trigger = (cmd.trigger_data && cmd.trigger_data.trigger) || cmd.command_name || null;
    const response = cmd.command_code || cmd.response || '';
    return res.json({ trigger, response });
  } catch (err) {
    console.error('[GET /command/:id] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// --- WORKERS: List workers for a guild (admin only) ---
// GET /api/v1/guilds/:guildId/workers
router.get('/guilds/:guildId/workers', authenticateToken, rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { filterState } = req.query;
    const workers = await workerService.listWorkers(guildId, filterState);
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Consolidated GET /guilds/:guildId/commands route: supports both agent (internal secret) and frontend (RBAC) access
router.get('/guilds/:guildId/commands', authenticateToken, async (req, res, next) => {
  try {
    console.log('[DEBUG] /guilds/:guildId/commands called');
    console.log('[DEBUG] req.headers:', req.headers);
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_BOT_SECRET;
    console.log('[DEBUG] x-internal-secret header:', internalSecret);
    console.log('[DEBUG] expected INTERNAL_BOT_SECRET:', expectedSecret);
    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      console.log('[DEBUG] Internal secret matched. Agent access granted.');
      // Agent is allowed, skip RBAC
    } else {
      // Always require RBAC for frontend requests
      if (!req.user || !req.user.discord_id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      // RBAC will handle admin/owner override
      const rbacResult = await new Promise((resolve) => {
        rbacMiddleware('admin')(req, {
          ...res,
          json: (body) => resolve({ error: true, body }),
          status: (code) => {
            res.statusCode = code;
            return res;
          },
          send: (body) => resolve({ error: true, body }),
        }, () => resolve({ error: false }));
      });
      if (rbacResult.error) return res.status(res.statusCode || 403).json(rbacResult.body);
    }
    const { guildId } = req.params;
    const { triggerType } = req.query;
    let commands;
    if (triggerType) {
      commands = await commandService.getCommandsByTrigger(guildId, triggerType);
    } else {
      commands = await commandService.listCommands(guildId);
    }
    // Always return 200 with an array, even if empty
    if (!commands || !Array.isArray(commands)) commands = [];
    res.json({ success: true, commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.use(authenticateToken);

// Create or update a command for a guild
router.post('/guilds/:guildId/commands', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { 
      command_name, 
      command_code, 
      description, 
      trigger_data,
      trigger_type,
      response_type,
      case_sensitive,
      trigger_on_edit,
      is_ephemeral,
      response_in_dm,
      delete_trigger,
      delete_response,
      cooldown_seconds,
      require_roles,
      ignore_roles,
      require_channels,
      ignore_channels,
      enabled
    } = req.body;
    const authorDiscordId = req.user?.discord_id;

    if (!command_code) {
      return res.status(400).json({ error: 'Command code is required' });
    }

    // Use trigger as fallback name if command_name is not provided
    const finalName = command_name || trigger_data?.trigger || null;

    console.log('[POST /guilds/:guildId/commands] Creating command:', {
      guildId,
      finalName,
      trigger_type,
      trigger_data
    });

    // Pass all options to createCommand
    const command = await commandService.createCommand(
      guildId,
      finalName,
      command_code,
      authorDiscordId,
      { 
        description,
        triggerType: trigger_type,
        triggerData: trigger_data,
        triggerOnEdit: trigger_on_edit,
        caseSensitive: case_sensitive,
        responseType: response_type,
        responseInDM: response_in_dm,
        deleteTrigger: delete_trigger,
        deleteResponse: delete_response,
        cooldownSeconds: cooldown_seconds,
        requireRoles: require_roles,
        ignoreRoles: ignore_roles,
        requireChannels: require_channels,
        ignoreChannels: ignore_channels,
        enabled,
        isEphemeral: is_ephemeral
      }
    );
    
    console.log('[POST /guilds/:guildId/commands] Command created:', command);
    res.json({ success: true, command });
  } catch (error) {
    console.error('[POST /guilds/:guildId/commands] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List commands for a guild
// Allow agent (internal secret) to bypass rbacMiddleware('admin')
router.get('/guilds/:guildId/commands', async (req, res, next) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_BOT_SECRET;
    console.log('[DEBUG] /guilds/:guildId/commands called');
    console.log('[DEBUG] x-internal-secret header:', internalSecret);
    console.log('[DEBUG] expected INTERNAL_BOT_SECRET:', expectedSecret);
    if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
      console.log('[DEBUG] Internal secret matched. Agent access granted.');
      // Agent is allowed
    } else {
      console.log('[DEBUG] Internal secret mismatch or missing. Falling back to RBAC.');
      // Enforce admin RBAC for normal users, but always return JSON error
      return rbacMiddleware('admin')(
        req,
        {
          ...res,
          status: (code) => {
            res.statusCode = code;
            return res;
          },
          send: (body) => {
            if (typeof body === 'string' && body.startsWith('<!DOCTYPE')) {
              // Replace HTML error with JSON
              return res.json({ success: false, error: 'Unauthorized or forbidden' });
            }
            return res.send(body);
          },
        },
        next
      );
    }
    const { guildId } = req.params;
    const { triggerType } = req.query;
    let commands;
    if (triggerType) {
      commands = await commandService.getCommandsByTrigger(guildId, triggerType);
    } else {
      commands = await commandService.listCommands(guildId);
    }
    // Always return 200 with an array, even if empty
    if (!commands || !Array.isArray(commands)) commands = [];
    res.json({ success: true, commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific command by command_index
router.get('/guilds/:guildId/commands/index/:commandIndex', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, commandIndex } = req.params;
    const command = await commandService.getCommandByIndex(guildId, parseInt(commandIndex, 10));
    if (!command) return res.status(404).json({ error: 'Command not found' });
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete a command by its command_index
router.delete('/guilds/:guildId/commands/index/:commandIndex', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, commandIndex } = req.params;
    // Resolve the command by index first to get internal id
    const cmd = await commandService.getCommandByIndex(guildId, parseInt(commandIndex, 10));
    if (!cmd) return res.status(404).json({ error: 'Command not found.' });
    const deleted = await commandService.deleteCommand(cmd.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Command not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Update a command by its command_index
router.put('/guilds/:guildId/commands/index/:commandIndex', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, commandIndex } = req.params;
    const { 
      command_code, 
      description, 
      trigger_data,
      trigger_type,
      response_type,
      case_sensitive,
      trigger_on_edit,
      is_ephemeral,
      response_in_dm,
      delete_trigger,
      delete_response,
      cooldown_seconds,
      require_roles,
      ignore_roles,
      require_channels,
      ignore_channels,
      enabled
    } = req.body;
    
    // Resolve command by index
    const cmd = await commandService.getCommandByIndex(guildId, parseInt(commandIndex, 10));
    if (!cmd) return res.status(404).json({ error: 'Command not found' });
    
    const command = await commandService.updateCommand(cmd.id, command_code, description, { 
      triggerType: trigger_type,
      triggerData: trigger_data,
      triggerOnEdit: trigger_on_edit,
      caseSensitive: case_sensitive,
      responseType: response_type,
      responseInDM: response_in_dm,
      deleteTrigger: delete_trigger,
      deleteResponse: delete_response,
      cooldownSeconds: cooldown_seconds,
      requireRoles: require_roles,
      ignoreRoles: ignore_roles,
      requireChannels: require_channels,
      ignoreChannels: ignore_channels,
      enabled,
      isEphemeral: is_ephemeral
    });
    
    // Refresh bot commands for guild
    try {
      await commandService.refreshCustomCommands(guildId);
    } catch (refreshError) {
      console.error('[PUT /guilds/:guildId/commands/index/:commandIndex] Error refreshing bot commands:', refreshError);
    }
    res.json({ success: true, command });
  } catch (error) {
    console.error('[PUT /guilds/:guildId/commands/index/:commandIndex] ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a command by its ID (RESTful: /guilds/:guildId/commands/:commandId)
router.delete('/guilds/:guildId/commands/:commandId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { commandId } = req.params;
    const deleted = await commandService.deleteCommand(commandId);
    if (!deleted) {
      return res.status(404).json({ error: 'Command not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Refresh custom slash commands with Discord
router.post('/bot/commands/refresh-custom', rbacMiddleware('admin'), async (req, res) => {
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
