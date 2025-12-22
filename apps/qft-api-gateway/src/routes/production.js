// qft-api-gateway/src/routes/production.js
// Routes for production modules: commands, tickets, logs, backups, workers

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const commandService = require('../services/commandService');
const ticketService = require('../services/ticketService');
const logService = require('../services/logService');
const backupService = require('../services/backupService');
const workerService = require('../services/workerService');
const embedTemplateService = require('../services/embedTemplateService');
const moduleService = require('../services/moduleService');
const databaseService = require('../services/databaseService');
const authMiddleware = require('../middleware/auth');

// Middleware for role-based access
const rbacMiddleware = (requiredRole) => (req, res, next) => {
  const userRole = req.user?.qft_role; // Set by auth middleware
  const allowedRoles = {
    staff: ['admin', 'staff', 'alpha_owner', 'α', 'Ω'],
    admin: ['admin', 'alpha_owner', 'α', 'Ω'],
    user: ['admin', 'staff', 'alpha_owner', 'level_0_standard', 'α', 'Ω'],
  };
  if (!allowedRoles[requiredRole]?.includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden', userRole, requiredRole });
  }
  next();
};

router.use(authMiddleware);

// ===== CUSTOM COMMANDS =====
router.post('/guilds/:guildId/commands', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { 
      commandName, 
      commandCode, 
      description,
      triggerType,
      triggerOnEdit,
      caseSensitive,
      responseType,
      responseInDM,
      deleteTrigger,
      deleteResponse,
      cooldownSeconds,
      requireRoles,
      ignoreRoles,
      requireChannels,
      ignoreChannels,
      enabled,
      isEphemeral
    } = req.body;
    const authorDiscordId = req.user?.discord_id;

    if (!commandName || !commandCode) {
      return res.status(400).json({ error: 'Command name and code are required' });
    }

    const command = await commandService.createCommand(guildId, commandName, commandCode, authorDiscordId, {
      description,
      triggerType,
      triggerOnEdit,
      caseSensitive,
      responseType,
      responseInDM,
      deleteTrigger,
      deleteResponse,
      cooldownSeconds,
      requireRoles,
      ignoreRoles,
      requireChannels,
      ignoreChannels,
      enabled,
      isEphemeral
    });
    
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/commands', async (req, res) => {
  try {
    const { guildId } = req.params;
    const commands = await commandService.listCommands(guildId);
    res.json({ success: true, commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/commands/:commandName', async (req, res) => {
  try {
    const { guildId, commandName } = req.params;
    const command = await commandService.getCommand(guildId, commandName);
    if (!command) return res.status(404).json({ error: 'Command not found' });
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/commands/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    const { 
      commandCode, 
      description,
      triggerType,
      triggerOnEdit,
      caseSensitive,
      responseType,
      responseInDM,
      deleteTrigger,
      deleteResponse,
      cooldownSeconds,
      requireRoles,
      ignoreRoles,
      requireChannels,
      ignoreChannels,
      enabled,
      isEphemeral
    } = req.body;
    
    const command = await commandService.updateCommand(commandId, commandCode, description, {
      triggerType,
      triggerOnEdit,
      caseSensitive,
      responseType,
      responseInDM,
      deleteTrigger,
      deleteResponse,
      cooldownSeconds,
      requireRoles,
      ignoreRoles,
      requireChannels,
      ignoreChannels,
      enabled,
      isEphemeral
    });
    
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/commands/:commandId', async (req, res) => {
  try {
    const { commandId } = req.params;
    await commandService.deleteCommand(commandId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import YAGPDB commands
router.post('/guilds/:guildId/commands/import/yagpdb', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { yagpdbJson } = req.body;
    const authorDiscordId = req.user?.discord_id;
    const command = await commandService.importYAGPDBCommand(guildId, yagpdbJson, authorDiscordId);
    res.json({ success: true, command });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== TICKETS =====
router.post('/guilds/:guildId/tickets', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { title, description, ticketChannelId } = req.body;
    const userDiscordId = req.user?.discord_id;
    const result = await ticketService.createTicket(guildId, userDiscordId, title, description, ticketChannelId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/tickets', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const tickets = await ticketService.listTickets(guildId, status, limit, offset);
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await ticketService.getTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tickets/:ticketId/transcript', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const messages = await ticketService.getTranscript(ticketId);
    const html = await ticketService.generateHtmlTranscript(ticketId);
    res.json({ success: true, messages, htmlUrl: `/transcripts/${ticketId}.html` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tickets/:ticketId/close', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await ticketService.getTicket(ticketId);
    await ticketService.closeTicket(ticketId, ticket?.thread_id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== LOGS =====
router.get('/guilds/:guildId/logs', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { actionType, startDate, endDate, limit, offset } = req.query;
    const logs = await logService.getLogs(guildId, { actionType, startDate, endDate, limit: parseInt(limit) || 100, offset: parseInt(offset) || 0 });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/logs/stats', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { days = 7 } = req.query;
    const stats = await logService.getLogStats(guildId, days);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/guilds/:guildId/logs/setup-channel', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, categories } = req.body;
    const result = await logService.setupLogChannel(guildId, channelId, categories, req.client);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== BACKUPS =====
router.post('/guilds/:guildId/backups', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const createdByDiscordId = req.user?.discord_id;
    // Client is null because we use Agent API now
    const result = await backupService.createBackup(guildId, null, createdByDiscordId, false);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/backups', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const backups = await backupService.listBackups(guildId, limit, offset);
    res.json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/backups/:backupId/restore', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { backupId } = req.params;
    // Restore now handled via Agent API, no need for client or guildId in args
    const result = await backupService.restoreBackup(backupId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== WORKERS =====
router.post('/guilds/:guildId/workers', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { workerName, description, trigger, actions, platforms } = req.body;
    const createdByDiscordId = req.user?.discord_id;
    const worker = await workerService.createWorker(guildId, workerName, description, trigger, actions, createdByDiscordId, platforms);
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/workers', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { state } = req.query;
    const workers = await workerService.listWorkers(guildId, state);
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const worker = await workerService.getWorker(workerId);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const worker = await workerService.updateWorker(workerId, req.body);
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workers/:workerId/execute', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { triggerData } = req.body;
    const result = await workerService.executeWorker(workerId, triggerData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workers/:workerId/history', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { limit = 50 } = req.query;
    const history = await workerService.getExecutionHistory(workerId, limit);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/workers/:workerId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { workerId } = req.params;
    await workerService.deleteWorker(workerId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kick Bot
router.delete('/guilds/:guildId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const response = await fetch(`${botUrl}/api/guilds/${guildId}`, {
      method: 'DELETE',
      headers: { 'Internal-Secret': process.env.INTERNAL_BOT_SECRET }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy Commands
router.post('/bot/commands/deploy', rbacMiddleware('admin'), async (req, res) => {
  try {
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const response = await fetch(`${botUrl}/api/deploy-commands`, {
      method: 'POST',
      headers: { 'Internal-Secret': process.env.INTERNAL_BOT_SECRET }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh Custom Slash Commands for Guild
router.post('/bot/commands/refresh-custom', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.body;
    
    if (!guildId) {
      return res.status(400).json({ success: false, message: 'Guild ID is required' });
    }
    
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const response = await fetch(`${botUrl}/api/refresh-custom-commands`, {
      method: 'POST',
      headers: { 
        'Internal-Secret': process.env.INTERNAL_BOT_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ guildId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Bot service error' }));
      return res.status(response.status).json({ 
        success: false, 
        message: errorData.message || 'Failed to refresh commands' 
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in refresh-custom endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== EMBED TEMPLATES =====
router.post('/guilds/:guildId/embed-templates', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { templateName, embedData } = req.body;
    const authorDiscordId = req.user?.discord_id || 'unknown';

    console.log('[Embed Templates] Save request:', { guildId, templateName, hasEmbedData: !!embedData, authorDiscordId });

    if (!templateName || !embedData) {
      console.error('[Embed Templates] Missing required fields');
      return res.status(400).json({ error: 'Template name and embed data are required' });
    }

    const template = await embedTemplateService.saveTemplate(guildId, templateName, embedData, authorDiscordId);
    console.log('[Embed Templates] Template saved successfully:', template.id);
    res.json({ success: true, template });
  } catch (error) {
    console.error('[Embed Templates] Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/embed-templates', async (req, res) => {
  try {
    const { guildId } = req.params;
    console.log('[Embed Templates] Get templates for guild:', guildId);
    const templates = await embedTemplateService.getTemplates(guildId);
    console.log('[Embed Templates] Found templates:', templates.length);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('[Embed Templates] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/embed-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await embedTemplateService.getTemplateById(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/embed-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { guildId } = req.body;
    const deleted = await embedTemplateService.deleteTemplate(templateId, guildId);
    if (!deleted) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== AI WORKERS =====
router.get('/guilds/:guildId/workers', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { state } = req.query;
    const workers = await workerService.listWorkers(guildId, state);
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/guilds/:guildId/workers', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { workerName, description, trigger, actions, platforms, assignedRoleId } = req.body;
    const createdByDiscordId = req.user?.discord_id || 'unknown';
    
    const worker = await workerService.createWorker(
      guildId, 
      workerName, 
      description, 
      trigger, 
      actions, 
      createdByDiscordId,
      platforms || ['discord'],
      assignedRoleId
    );
    
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/workers/:workerId', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const updates = req.body;
    const worker = await workerService.updateWorker(workerId, updates);
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/workers/:workerId', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { workerId } = req.params;
    await workerService.deleteWorker(workerId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workers by role
router.get('/roles/:roleId/workers', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const workers = await workerService.getWorkersByRole(roleId);
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute a worker (with permission check)
router.post('/workers/:workerId/execute', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { triggerData } = req.body;
    const userDiscordId = req.user?.discord_id;
    
    // Check if user has permission to execute this worker
    const canExecute = await workerService.canExecuteWorker(workerId, userDiscordId);
    if (!canExecute) {
      return res.status(403).json({ error: 'You do not have permission to execute this worker' });
    }
    
    const result = await workerService.executeWorker(workerId, null, triggerData);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ACCOUNT SYNC =====
const accountSyncService = require('../services/accountSyncService');

router.post('/guilds/:guildId/sync-accounts', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3002';
    
    console.log(`[Account Sync] Starting sync for guild ${guildId}`);
    console.log(`[Account Sync] Agent URL: ${AGENT_URL}`);
    
    // Call the agent to fetch Discord members with roles
    const response = await fetch(`${AGENT_URL}/api/guild/${guildId}/members?includeRoles=true&limit=1000`, {
      headers: {
        'x-internal-secret': process.env.INTERNAL_BOT_SECRET
      }
    });
    
    console.log(`[Account Sync] Agent response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Account Sync] Agent error: ${errorText}`);
      throw new Error(`Failed to fetch members from Discord: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[Account Sync] Received ${data.members?.length || 0} members from agent`);
    
    // Sync accounts to database
    const result = await accountSyncService.syncAccounts(guildId, data.members);
    
    console.log(`[Account Sync] Successfully synced ${result.syncedCount} accounts (${result.newUsersCount} new)`);
    res.json({ 
      success: true, 
      syncedCount: result.syncedCount,
      newUsersCount: result.newUsersCount,
      lastSyncTime: new Date() 
    });
  } catch (error) {
    console.error('[Account Sync] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/guilds/:guildId/synced-accounts', rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const accounts = await accountSyncService.getSyncedAccounts(guildId);
    const lastSyncTime = await accountSyncService.getLastSyncTime(guildId);
    res.json({ success: true, accounts, lastSyncTime });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/synced-accounts/:accountId/role', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { role } = req.body;
    await accountSyncService.updateAccountRole(accountId, role);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/synced-accounts/:accountId/link-staff', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { staffProfileId } = req.body;
    await accountSyncService.linkAccountToStaff(accountId, staffProfileId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MODULE MANAGER =====

// Get all pages with categories and modules
router.get('/modules/pages', rbacMiddleware('admin'), async (req, res) => {
  try {
    const pages = await moduleService.getAllPages();
    res.json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific page by key
router.get('/modules/pages/:pageKey', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageKey } = req.params;
    const page = await moduleService.getPageByKey(pageKey);
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new page
router.post('/modules/pages', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageKey, name, description, icon, displayOrder } = req.body;
    const page = await moduleService.createPage(pageKey, name, description, icon, displayOrder);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a page
router.patch('/modules/pages/:pageId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId } = req.params;
    const updates = req.body;
    const page = await moduleService.updatePage(pageId, updates);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a page
router.delete('/modules/pages/:pageId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId } = req.params;
    const deleted = await moduleService.deletePage(pageId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a category
router.post('/modules/categories', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId, categoryKey, name, description, displayOrder } = req.body;
    const category = await moduleService.createCategory(pageId, categoryKey, name, description, displayOrder);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category
router.patch('/modules/categories/:categoryId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;
    const category = await moduleService.updateCategory(categoryId, updates);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a category
router.delete('/modules/categories/:categoryId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deleted = await moduleService.deleteCategory(categoryId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a module
router.post('/modules', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { 
      categoryId, 
      moduleKey, 
      name, 
      componentName, 
      description, 
      icon, 
      displayOrder, 
      requiredClearance, 
      configuration 
    } = req.body;
    
    const module = await moduleService.createModule(
      categoryId, 
      moduleKey, 
      name, 
      componentName, 
      description, 
      icon, 
      displayOrder, 
      requiredClearance, 
      configuration
    );
    
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a module
router.patch('/modules/:moduleId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const updates = req.body;
    const module = await moduleService.updateModule(moduleId, updates);
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a module
router.delete('/modules/:moduleId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const deleted = await moduleService.deleteModule(moduleId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update module orders (for drag-and-drop reordering)
router.post('/modules/reorder', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { updates } = req.body; // Array of { module_id, display_order }
    const result = await moduleService.updateModuleOrders(updates);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update category orders
router.post('/modules/categories/reorder', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { updates } = req.body; // Array of { category_id, display_order }
    const result = await moduleService.updateCategoryOrders(updates);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default module structure
router.post('/modules/initialize', rbacMiddleware('admin'), async (req, res) => {
  try {
    const result = await moduleService.initializeDefaultModules();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DATABASE MANAGEMENT =====

// Get all tables with row counts
router.get('/database/tables', rbacMiddleware('admin'), async (req, res) => {
  try {
    const tables = await databaseService.getAllTables();
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get database statistics
router.get('/database/stats', rbacMiddleware('admin'), async (req, res) => {
  try {
    const stats = await databaseService.getDatabaseStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table schema
router.get('/database/tables/:tableName/schema', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = await databaseService.getTableSchema(tableName);
    res.json({ success: true, schema });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table data with pagination
router.get('/database/tables/:tableName/data', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const data = await databaseService.getTableData(tableName, limit, offset);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup table data
router.post('/database/tables/:tableName/backup', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const backup = await databaseService.backupTable(tableName);
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a single row from table
router.delete('/database/tables/:tableName/rows', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { primaryKeyColumn, primaryKeyValue } = req.body;
    
    if (!primaryKeyColumn || primaryKeyValue === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: primaryKeyColumn, primaryKeyValue'
      });
    }

    const result = await databaseService.deleteRow(tableName, primaryKeyColumn, primaryKeyValue);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Truncate table (delete all rows)
router.delete('/database/tables/:tableName', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { confirmationCode } = req.body;
    
    if (confirmationCode !== `TRUNCATE_${tableName.toUpperCase()}`) {
      return res.status(400).json({ 
        error: 'Invalid confirmation code',
        required: `TRUNCATE_${tableName.toUpperCase()}`
      });
    }

    const result = await databaseService.truncateTable(tableName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purge entire database
router.post('/database/purge', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { confirmationCode } = req.body;
    const result = await databaseService.purgeDatabase(confirmationCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute custom SQL query (SELECT only)
router.post('/database/query', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { query } = req.body;
    const result = await databaseService.executeQuery(query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
