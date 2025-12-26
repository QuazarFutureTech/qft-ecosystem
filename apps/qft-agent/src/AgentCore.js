// qft-agent/src/AgentCore.js

require('dotenv').config();
const express = require('express');
const SettingsHandler = require('./utils/SettingsHandler');
const PlatformManager = require('./PlatformManager'); // Import the singleton PlatformManager
const DiscordAdapter = require('./adapters/DiscordAdapter'); // Import DiscordAdapter
const WorkerScheduler = require('./modules/workerScheduler'); // Import WorkerScheduler
const TicketManager = require('./modules/tickets'); // Import TicketManager
const BackupService = require('./services/backupService'); // Import BackupService

// --- BOT + API CONFIG ---
const BOT_API_PORT = process.env.PORT || 3002;
const botApp = express();
botApp.use(express.json());

const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET || 'dev_secret';

// --- CLOUD RUN HEALTH CHECK ---
// Google needs this specific route to know the bot is alive.
botApp.get('/', (req, res) => {
    res.status(200).send('QFT Agent is Online! 🤖');
});
// -----------------------------

// Middleware to secure the bot's local API (only API Gateway can call it)
const internalAuth = (req, res, next) => {
    if (req.headers['internal-secret'] !== INTERNAL_SECRET) {
        return res.status(403).json({ message: 'Internal API access denied.' });
    }
    next();
};

// --- Platform Initialization ---
const discordAdapter = new DiscordAdapter(process.env.BOT_TOKEN);
discordAdapter.login(); // Login the Discord bot via its adapter

// --- 0. Initialize Settings ---
SettingsHandler.loadSettings(); // Load settings before anything else!

// --- Initialize Worker Scheduler ---
const workerScheduler = new WorkerScheduler(discordAdapter.client);
workerScheduler.initialize(); // Initialize schedule-based workers

const backupService = new BackupService(discordAdapter.client);
console.log('✅ Worker Scheduler initialized');

// --- Make client available to routes ---
botApp.locals.client = discordAdapter.client;

// --- Mount Guild Data Routes ---
try {
    const guildDataRoutes = require('./routes/guildData');
    botApp.use('/api', guildDataRoutes);
    console.log('✅ Guild data routes loaded');
} catch (err) {
    console.error('❌ Failed to load guild data routes:', err.message);
}

// --- 3. Internal API Endpoints ---
// Get User's Mutual Guilds
botApp.get('/api/guilds/:userId', internalAuth, async (req, res) => {
    const userId = req.params.userId;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    const mutualGuilds = [];
    try {
        for (const [guildId, guild] of discordAdapterInstance.getGuildsCache()) {
            try {
                // Ensure the guild members are cached/fetched
                await guild.members.fetch(userId); // Fetch a specific member
                mutualGuilds.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon // <-- Return the icon hash, not the URL
                });
            } catch {
                // User not in this guild, skip
            }
        }
        res.json(mutualGuilds);
    } catch (error) {
        console.error(`Error fetching mutual guilds for user ${userId}:`, error);
        res.status(500).json({ message: 'Failed to retrieve mutual guilds.' });
    }
});

// Get channels for a specific guild
botApp.get('/api/guilds/:guildId/channels', internalAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        const result = await discordAdapterInstance.fetchGuildChannels(guildId);
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        console.error(`Error fetching channels for guild ${guildId}:`, error);
        res.status(500).json({ message: 'Failed to fetch channels due to an internal bot error.' });
    }
});

// Get roles for a specific guild
botApp.get('/api/guilds/:guildId/roles', internalAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        const result = await discordAdapterInstance.fetchGuildRoles(guildId);
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        console.error(`Error fetching roles for guild ${guildId}:`, error);
        res.status(500).json({ message: 'Failed to fetch roles due to an internal bot error.' });
    }
});

// Kick Bot from Guild
botApp.delete('/api/guilds/:guildId', internalAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        const result = await discordAdapterInstance.leaveGuild(guildId);
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (error) {
        console.error(`Error leaving guild ${guildId}:`, error);
        res.status(500).json({ message: 'Failed to leave guild due to an internal Discord error.' });
    }
});

// Update a member's role in a guild
botApp.put('/api/guilds/:guildId/members/:userId/roles', internalAuth, async (req, res) => {
    const { guildId, userId } = req.params;
    const { roleId, roleName } = req.body; // Can specify by ID or Name
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    if (!roleId && !roleName) {
        return res.status(400).json({ message: 'Either roleId or roleName must be provided.' });
    }

    try {
        const result = await discordAdapterInstance.updateGuildMemberRole(guildId, userId, { roleId, roleName });
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(400).json({ message: result.message }); // Use 400 for client-side errors (e.g., role not found)
        }
    } catch (error) {
        console.error(`Error updating role for user ${userId} in guild ${guildId}:`, error);
        res.status(500).json({ message: 'Failed to update member role due to an internal bot error.' });
    }
});

// Set Discord Rich Presence for the bot
botApp.post('/api/set-rpc-activity', internalAuth, async (req, res) => {
    const { activity } = req.body; // activity should be a Discord.Presence object or similar
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        // Ensure the activity object is valid according to discord.js PresenceData
        // We'll rely on discord.js to validate the structure
        await discordAdapterInstance.client.user.setPresence(activity);
        res.json({ success: true, message: 'Discord Rich Presence updated successfully.' });
    } catch (error) {
        console.error('Error setting Discord Rich Presence:', error);
        res.status(500).json({ message: 'Failed to update Discord Rich Presence.' });
    }
});

// Post an embed to a channel
botApp.post('/api/guilds/:guildId/channels/:channelId/embed', internalAuth, async (req, res) => {
    const { guildId, channelId } = req.params;
    const embedData = req.body || {};
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        const result = await discordAdapterInstance.sendEmbedToChannel(guildId, channelId, embedData);
        if (!result.success) return res.status(400).json(result);
        res.json(result);
    } catch (error) {
        console.error('Error posting embed:', error);
        res.status(500).json({ success: false, message: 'Failed to post embed.' });
    }
});

// List scheduled embeds for a guild
botApp.get('/api/guilds/:guildId/scheduled-embeds', internalAuth, async (req, res) => {
    const { guildId } = req.params;
    try {
        const PlatformManager = require('./PlatformManager');
        const scheduler = PlatformManager.get('scheduler');
        if (!scheduler) return res.status(503).json({ jobs: [], message: 'Scheduler not available.' });
        const jobs = scheduler.listJobs(guildId);
        res.json({ jobs });
    } catch (error) {
        console.error('Error listing scheduled embeds:', error);
        res.status(500).json({ jobs: [], message: 'Failed to list scheduled embeds.' });
    }
});

// Remove a scheduled embed
botApp.delete('/api/guilds/:guildId/scheduled-embeds/:jobId', internalAuth, async (req, res) => {
    const { guildId, jobId } = req.params;
    try {
        const PlatformManager = require('./PlatformManager');
        const scheduler = PlatformManager.get('scheduler');
        if (!scheduler) return res.status(503).json({ message: 'Scheduler not available.' });
        const ok = scheduler.removeJob(jobId);
        if (ok) {
            res.json({ success: true, message: `Removed schedule ${jobId}` });
        } else {
            res.status(404).json({ success: false, message: `No such schedule: ${jobId}` });
        }
    } catch (error) {
        console.error('Error removing scheduled embed:', error);
        res.status(500).json({ success: false, message: 'Failed to remove scheduled embed.' });
    }
});

// --- 4. Startup (Express Server) ---
botApp.listen(BOT_API_PORT, () => {
    console.log(`🤖 Bot Internal API listening on port ${BOT_API_PORT}`);
});

// Get custom commands for a guild
botApp.get('/api/guilds/:guildId/custom-commands', internalAuth, async (req, res) => {
    try {
        const ConfigManager = require('./utils/ConfigManager');
        const cmds = ConfigManager.get(req.params.guildId, 'customCommands', {});
        res.json({ success: true, commands: cmds });
    } catch (err) {
        console.error('Failed to fetch custom commands:', err);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// Create/update custom command
botApp.post('/api/guilds/:guildId/custom-commands', internalAuth, async (req, res) => {
    try {
        const ConfigManager = require('./utils/ConfigManager');
        const { name, response, cooldown, roleId } = req.body;
        if (!name || !response) return res.status(400).json({ success: false, message: 'Name and response required.' });
        const cmds = ConfigManager.get(req.params.guildId, 'customCommands', {});
        cmds[name.toLowerCase()] = { response, cooldown: cooldown || 0, roleId: roleId || null, createdAt: Date.now() };
        ConfigManager.set(req.params.guildId, 'customCommands', cmds);
        res.json({ success: true, message: `Command ${name} saved.` });
    } catch (err) {
        console.error('Failed to save custom command:', err);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// Delete custom command
botApp.delete('/api/guilds/:guildId/custom-commands/:name', internalAuth, async (req, res) => {
    try {
        const ConfigManager = require('./utils/ConfigManager');
        const name = decodeURIComponent(req.params.name).toLowerCase();
        const cmds = ConfigManager.get(req.params.guildId, 'customCommands', {});
        if (cmds[name]) {
            delete cmds[name];
            ConfigManager.set(req.params.guildId, 'customCommands', cmds);
            res.json({ success: true, message: `Deleted ${name}` });
        } else {
            res.status(404).json({ success: false, message: `No such command: ${name}` });
        }
    } catch (err) {
        console.error('Failed to delete custom command:', err);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// Moderation actions (ban, kick, timeout)
botApp.post('/api/guilds/:guildId/members/:userId/:action', internalAuth, async (req, res) => {
    const { guildId, userId, action } = req.params;
    const { reason, minutes } = req.body || {};
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ message: 'Discord bot client not ready.' });
    }

    try {
        const guild = discordAdapterInstance.getGuild(guildId);
        if (!guild) return res.status(404).json({ message: 'Guild not found.' });

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member && action !== 'ban') {
            return res.status(404).json({ message: 'Member not found.' });
        }

        if (action === 'kick' && member) {
            await member.kick(reason || 'No reason provided');
            res.json({ success: true, message: `Kicked user ${userId}` });
        } else if (action === 'ban') {
            await guild.members.ban(userId, { reason: reason || 'No reason provided' });
            res.json({ success: true, message: `Banned user ${userId}` });
        } else if (action === 'timeout' && member) {
            const ms = (minutes || 10) * 60 * 1000;
            await member.timeout(ms, reason || 'No reason provided');
            res.json({ success: true, message: `Timed out user ${userId} for ${minutes} minutes` });
        } else {
            res.status(400).json({ message: 'Invalid action or missing member.' });
        }
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        res.status(500).json({ message: `Failed to ${action} user: ${error.message}` });
    }
});

// Persist guild-level config (e.g., welcome/leave templates, automod toggles, custom commands)
botApp.put('/api/guilds/:guildId/config', internalAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const payload = req.body;
    try {
        // Validate payload is an object
        if (!payload || typeof payload !== 'object') return res.status(400).json({ success: false, message: 'Invalid payload' });
        const ConfigManager = require('./utils/ConfigManager');
        // Merge settings (shallow merge)
        const existing = ConfigManager.get(guildId, null, {});
        const merged = { ...existing, ...payload };
        // Save each key
        for (const [k, v] of Object.entries(merged)) {
            ConfigManager.set(guildId, k, v, { source: 'api' });
        }
        res.json({ success: true, message: 'Guild config updated.' });
    } catch (err) {
        console.error('Failed to update guild config via API:', err);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// Get guild config
botApp.get('/api/guilds/:guildId/config', internalAuth, async (req, res) => {
    try {
        const ConfigManager = require('./utils/ConfigManager');
        const cfg = ConfigManager.getGuild(req.params.guildId);
        res.json({ success: true, data: cfg.settings });
    } catch (err) {
        console.error('Failed to fetch guild config via API:', err);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// ===== WORKER SCHEDULER ENDPOINTS =====
// Get active scheduled jobs
botApp.get('/api/scheduler/jobs', internalAuth, async (req, res) => {
    try {
        const jobs = workerScheduler.getActiveJobs();
        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Error getting active jobs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active jobs' });
    }
});

// Schedule a new worker
botApp.post('/api/scheduler/schedule', internalAuth, async (req, res) => {
    const { guildId, workerId, cronExpression, triggerConfig } = req.body;

    if (!guildId || !workerId || !cronExpression) {
        return res.status(400).json({ success: false, message: 'guildId, workerId, and cronExpression required' });
    }

    try {
        const jobId = workerScheduler.scheduleWorker(guildId, workerId, cronExpression, triggerConfig);
        res.json({ success: true, jobId, message: `Worker ${workerId} scheduled with cron: ${cronExpression}` });
    } catch (error) {
        console.error('Error scheduling worker:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update a scheduled worker
botApp.put('/api/scheduler/schedule/:jobId', internalAuth, async (req, res) => {
    const { jobId } = req.params;
    const { guildId, workerId, cronExpression, triggerConfig } = req.body;

    if (!cronExpression) {
        return res.status(400).json({ success: false, message: 'cronExpression required' });
    }

    try {
        const newJobId = workerScheduler.updateScheduledWorker(jobId, cronExpression, workerId, guildId, triggerConfig);
        res.json({ success: true, jobId: newJobId, message: 'Worker schedule updated' });
    } catch (error) {
        console.error('Error updating scheduled worker:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Unschedule a worker
botApp.delete('/api/scheduler/schedule/:jobId', internalAuth, async (req, res) => {
    const { jobId } = req.params;

    try {
        const removed = workerScheduler.unscheduleWorker(jobId);
        if (removed) {
            res.json({ success: true, message: `Worker schedule ${jobId} removed` });
        } else {
            res.status(404).json({ success: false, message: `Job ${jobId} not found` });
        }
    } catch (error) {
        console.error('Error unscheduling worker:', error);
        res.status(500).json({ success: false, message: 'Failed to unschedule worker' });
    }
});



// Deploy commands globally
botApp.post('/api/deploy-commands', internalAuth, async (req, res) => {
    try {
        const { exec } = require('child_process');
        exec('node src/deploy-commands.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.status(500).json({ success: false, message: `Deploy failed: ${error.message}` });
            }
            console.log(`stdout: ${stdout}`);
            if (stderr) console.error(`stderr: ${stderr}`);
            res.json({ success: true, message: 'Commands deployed successfully.', count: 'ALL' });
        });
    } catch (error) {
        console.error('Error deploying commands:', error);
        res.status(500).json({ success: false, message: 'Internal error' });
    }
});

// Refresh custom slash commands for a guild
botApp.post('/api/refresh-custom-commands', internalAuth, async (req, res) => {
    try {
        const { guildId } = req.body;
        
        if (!guildId) {
            return res.status(400).json({ success: false, message: 'Guild ID is required' });
        }
        
        const SlashCommandHandler = require('./services/slashCommandHandler');
        const discordAdapterInstance = PlatformManager.adapters.get('discord');
        
        if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
            return res.status(503).json({ success: false, message: 'Discord bot client not ready.' });
        }
        
        const slashHandler = new SlashCommandHandler(discordAdapterInstance.client);
        await slashHandler.registerSlashCommands(guildId);
        
        res.json({ success: true, message: 'Custom slash commands refreshed successfully.' });
    } catch (error) {
        console.error('Error refreshing custom commands:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Ticket System Endpoints ---
botApp.post('/api/internal/tickets/create', internalAuth, async (req, res) => {
    const { guildId, channelId, userId, title, description, ticketNumber } = req.body;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ success: false, message: 'Discord bot client not ready.' });
    }

    const result = await TicketManager.createTicketThread(
        discordAdapterInstance.client,
        guildId,
        channelId,
        userId,
        title,
        description,
        ticketNumber
    );

    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

botApp.post('/api/internal/tickets/close', internalAuth, async (req, res) => {
    const { threadId } = req.body;
    const discordAdapterInstance = PlatformManager.adapters.get('discord');

    if (!discordAdapterInstance || !discordAdapterInstance.isClientReady()) {
        return res.status(503).json({ success: false, message: 'Discord bot client not ready.' });
    }

    const result = await TicketManager.closeTicketThread(discordAdapterInstance.client, threadId);
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

// --- Backup Endpoints ---
botApp.post('/api/internal/backups/generate', internalAuth, async (req, res) => {
    const { guildId } = req.body;
    try {
        const backupData = await backupService.generateBackup(guildId);
        res.json({ success: true, backup: backupData });
    } catch (error) {
        console.error('Error generating backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

botApp.post('/api/internal/backups/restore', internalAuth, async (req, res) => {
    const { guildId, backupData } = req.body;
    try {
        const result = await backupService.restoreBackup(guildId, backupData);
        res.json(result);
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});