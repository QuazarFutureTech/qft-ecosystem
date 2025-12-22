const AutoMod = require('../modules/automod');
const ConfigManager = require('../utils/ConfigManager');
const CustomCommandHandler = require('../services/customCommandHandler');
const logService = require('../services/logService');
const workerService = require('../services/workerService');

// In-memory cooldown map: key -> Map(userId -> expiryTs)
const cooldowns = new Map();

// Initialize custom command handler (singleton)
let commandHandler = null;

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        // Initialize command handler if not already done
        if (!commandHandler) {
            commandHandler = new CustomCommandHandler(client);
        }

        const guildId = message.guildId;
        const userId = message.author.id;

        // ===== LOG MESSAGE (Production) =====
        try {
            await logService.logAction(guildId, 'message', userId, {
                messageId: message.id,
                channelId: message.channelId,
                content: message.content.substring(0, 200),
                attachments: message.attachments.size,
            }, null, null, client);
        } catch (error) {
            console.error('Error logging message:', error);
        }

        // --- 0. Automod checks ---
        try {
            const result = await AutoMod.checkMessage(message);
            if (result.action === 'delete') {
                // Inform briefly (auto-delete after 8s)
                const warn = await message.channel.send({ content: `⚠️ Message removed (${result.reason}).` }).catch(() => null);
                if (warn) setTimeout(() => warn.delete().catch(() => {}), 8000);
                return;
            }
        } catch (err) {
            console.error('Automod error:', err);
        }

        // --- 0.5. Worker Triggers ---
        try {
            const workers = await workerService.getWorkersByTrigger(guildId, 'message');
            for (const worker of workers) {
                const trigger = worker.trigger; // { type: 'message', keyword: '...' }
                if (trigger.keyword && message.content.toLowerCase().includes(trigger.keyword.toLowerCase())) {
                    await workerService.executeWorker(worker, guildId, {
                        message,
                        content: message.content,
                        userId: message.author.id,
                        user: message.author,
                        channelId: message.channelId
                    }, client);
                }
            }
        } catch (err) {
            console.error('Worker trigger error:', err);
        }

        // --- 1. LLM Wake Word / Contextual Chat (Mode 3) ---
        if (message.content.toLowerCase().startsWith('agent,')) {
            await message.reply("🧠 AI listener active. Processing request...");
            return;
        }

        // --- 2. YAGPDB-style Custom Commands (Enhanced) ---
        if (guildId) {
            const prefix = ConfigManager.get(guildId, 'prefix', '!');
            const handled = await commandHandler.handleMessage(message, prefix);
            if (handled) {
                return; // Command was handled, stop processing
            }
        }


        // ===== WORKER TRIGGERS (Production) =====
        try {
            if (guildId) {
                const workers = await workerService.listWorkers(guildId, 'active');
                for (const worker of workers) {
                    const trigger = JSON.parse(worker.trigger);
                    if (trigger.type === 'message') {
                        // Check if message matches keyword
                        if (message.content.toLowerCase().includes(trigger.keyword?.toLowerCase())) {
                            const triggerData = {
                                message,
                                member: message.member,
                                author: message.author,
                                channel: message.channel,
                                guild: message.guild,
                            };
                            await workerService.executeWorker(worker.id, triggerData);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error executing workers:', error);
        }

        // --- 3. Future Dynamic Command Handler (Yagpdb replacement) ---
        // if (message.content.startsWith(prefix)) { ... }
    },
};