const express = require('express');
const router = express.Router();
const logService = require('../services/logService');
const workerService = require('../services/workerService');
const ticketService = require('../services/ticketService');
const commandService = require('../services/commandService');
const dbService = require('../services/dbService');
const registryService = require('../services/registryService');
const userService = require('../services/userService');
const moduleService = require('../services/moduleService');
const internalGuildDb = require('./internalGuildDb');

// Middleware to check internal secret
const internalAuth = (req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_BOT_SECRET) {
        return res.status(403).json({ error: 'Forbidden: Invalid internal secret' });
    }
    next();
};

router.use(internalAuth);
router.use(internalGuildDb);

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
            const triggerText = req.query.triggerText || req.query.trigger;
            let commands = await commandService.getCommandsByTrigger(guildId, triggerType, triggerText);
            // Patch: add 'name' property for agent compatibility (all trigger types)
            commands = commands.map(cmd => ({ ...cmd, name: cmd.command_name }));
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

// Execute command template (deprecated - execution now handled by qft-agent)
router.post('/commands/execute', async (_req, res) => {
    return res.status(410).json({
        success: false,
        error: 'Command execution has moved to the Agent. Fetch command data and execute templates in the Agent context.'
    });
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

// ===== INTERNAL DATABASE API =====
router.post('/db/query', async (req, res) => {
    try {
        const { table, where, limit } = req.body;
        const rows = await dbService.dbQuery(table, where, limit);
        res.json({ success: true, rows });
    } catch (error) {
        console.error('Error in /db/query:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/db/count', async (req, res) => {
    try {
        const { table, where } = req.body;
        const count = await dbService.dbCount(table, where);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Error in /db/count:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/db/insert', async (req, res) => {
    try {
        const { table, data } = req.body;
        const record = await dbService.dbInsert(table, data);
        res.json({ success: true, record });
    } catch (error) {
        console.error('Error in /db/insert:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/db/update/:id', async (req, res) => {
    try {
        const { table, data } = req.body;
        const { id } = req.params;
        const record = await dbService.dbUpdate(table, id, data);
        res.json({ success: true, record });
    } catch (error) {
        console.error('Error in /db/update:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/db/delete/:id', async (req, res) => {
    try {
        const { table } = req.body; // Table name still needed for validation
        const { id } = req.params;
        await dbService.dbDelete(table, id);
        res.json({ success: true, message: 'Record deleted.' });
    } catch (error) {
        console.error('Error in /db/delete:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== INTERNAL REGISTRY API =====
router.get('/registry/get', async (req, res) => {
    try {
        const { key, type } = req.query;
        if (!key) return res.status(400).json({ success: false, error: 'Key is required.' });
        const entry = await registryService.regGet(key, type);
        res.json({ success: true, entry });
    } catch (error) {
        console.error('Error in /registry/get:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/registry/getAll', async (req, res) => {
    try {
        const { type } = req.query;
        const entries = await registryService.regGetAll(type);
        res.json({ success: true, entries });
    } catch (error) {
        console.error('Error in /registry/getAll:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/registry/set', async (req, res) => {
    try {
        const { key, type, value, description } = req.body;
        if (!key || !type || value === undefined) return res.status(400).json({ success: false, error: 'Key, type, and value are required.' });
        const entry = await registryService.regSet(key, type, value, description);
        res.json({ success: true, entry });
    } catch (error) {
        console.error('Error in /registry/set:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/registry/delete', async (req, res) => {
    try {
        const { key, type } = req.body;
        if (!key || !type) return res.status(400).json({ success: false, error: 'Key and type are required.' });
        const success = await registryService.regDelete(key, type);
        res.json({ success });
    } catch (error) {
        console.error('Error in /registry/delete:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== INTERNAL USER & ROLE API =====
router.get('/users/get/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.getUser(userId);
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error in /users/get/:userId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/users/roles/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const roles = await userService.getUserRoles(userId);
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Error in /users/roles/:userId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/users/hasRole/:userId/:roleId', async (req, res) => {
    try {
        const { userId, roleId } = req.params;
        const hasRole = await userService.hasRole(userId, roleId);
        res.json({ success: true, hasRole });
    } catch (error) {
        console.error('Error in /users/hasRole/:userId/:roleId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/users/checkPermission/:userId/:permissionKey', async (req, res) => {
    try {
        const { userId, permissionKey } = req.params;
        const hasPermission = await userService.checkPermission(userId, permissionKey);
        res.json({ success: true, hasPermission });
    } catch (error) {
        console.error('Error in /users/checkPermission/:userId/:permissionKey:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/users/permissions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const permissions = await userService.getUserPermissions(userId);
        res.json({ success: true, permissions });
    } catch (error) {
        console.error('Error in /users/permissions/:userId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/users/validate/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const isValid = await userService.validateUser(userId);
        res.json({ success: true, isValid });
    } catch (error) {
        console.error('Error in /users/validate/:userId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/roles/validate/:roleId', async (req, res) => {
    try {
        const { roleId } = req.params;
        const isValid = await userService.validateRole(roleId);
        res.json({ success: true, isValid });
    } catch (error) {
        console.error('Error in /roles/validate/:roleId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== INTERNAL MODULE API =====
router.get('/modules/get/:moduleId', async (req, res) => {
    try {
        const { moduleId } = req.params;
        const module = await moduleService.moduleGet(moduleId);
        res.json({ success: true, module });
    } catch (error) {
        console.error('Error in /modules/get/:moduleId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/modules/list/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const modules = await moduleService.moduleList(pageId);
        res.json({ success: true, modules });
    } catch (error) {
        console.error('Error in /modules/list/:pageId:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});




module.exports = router;
