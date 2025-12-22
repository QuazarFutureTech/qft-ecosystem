const express = require('express');
const router = express.Router();
const logService = require('../services/logService');
const workerService = require('../services/workerService');
const ticketService = require('../services/ticketService');
const commandService = require('../services/commandService');

// Middleware to check internal secret
const internalAuth = (req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_BOT_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid internal secret' });
    }
    next();
};

router.use(internalAuth);

// LOGS
router.post('/logs', async (req, res) => {
    try {
        const { guildId, actionType, executorId, details, targetId } = req.body;
        // Note: We pass null for client because the Gateway doesn't have the Discord client.
        // The Agent handles the Discord messaging.
        // We only want to save to DB here.
        // However, logService.logAction in Gateway tries to call sendToLogChannel which uses client.
        // We need to modify logService.logAction in Gateway to handle client being null/undefined.
        const log = await logService.logAction(guildId, actionType, executorId, details, targetId, null, null);
        res.json(log);
    } catch (error) {
        console.error('Error creating log:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// WORKERS
router.get('/workers', async (req, res) => {
    try {
        const { guildId, triggerType } = req.query;
        if (guildId && triggerType) {
            const workers = await workerService.getWorkersByTrigger(guildId, triggerType);
            return res.json(workers);
        }
        // This might need parameters
        const workers = await workerService.getAllWorkers(); // This method might not exist in workerService, check it
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TICKETS
router.post('/tickets', async (req, res) => {
    try {
        const ticket = await ticketService.createTicket(req.body);
        res.json(ticket);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// COMMANDS
router.get('/commands', async (req, res) => {
    try {
        const { guildId, trigger, triggerType } = req.query;
        
        if (guildId && trigger) {
            console.log(`[DEBUG] GET /commands - guildId=${guildId}, trigger=${trigger}`);
            const command = await commandService.getCommand(guildId, trigger);
            console.log(`[DEBUG] Resolved command:`, { id: command?.id, name: command?.command_name });
            return res.json(command);
        }
        
        if (guildId && triggerType) {
            const commands = await commandService.getCommandsByTrigger(guildId, triggerType);
            return res.json({ success: true, commands });
        }
        
        res.status(400).json({ error: 'Missing parameters' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DEBUG: List all commands with full details
router.get('/commands-debug', async (req, res) => {
    try {
        const { guildId } = req.query;
        if (!guildId) {
            return res.status(400).json({ error: 'guildId required' });
        }
        
        const commands = await commandService.listCommands(guildId);
        res.json({
            success: true,
            guildId,
            totalCommands: commands.length,
            commands: commands.map(cmd => ({
                id: cmd.id,
                command_name: cmd.command_name,
                trigger_type: cmd.trigger_type,
                is_active: cmd.is_active,
                enabled: cmd.enabled,
                created_at: cmd.created_at,
                updated_at: cmd.updated_at,
                last_executed_at: cmd.last_executed_at,
                execution_count: cmd.execution_count,
                cooldown_seconds: cmd.cooldown_seconds
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Execute command template
router.post('/commands/execute', async (req, res) => {
    try {
        const { commandCode, context } = req.body;
        const result = await commandService.executeCommand(commandCode, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update command execution stats
router.post('/commands/:commandId/stats', async (req, res) => {
    try {
        const { commandId } = req.params;
        await commandService.updateExecutionStats(commandId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
