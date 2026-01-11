// src/events/clientReady.js
const { Events, ActivityType } = require('discord.js');
const SlashCommandHandler = require('../services/slashCommandHandler');
const SettingsHandler = require('../utils/SettingsHandler'); // Import SettingsHandler
const fetch = require('node-fetch');
const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

module.exports = {
    name: Events.ClientReady, // The event Discord.js emits
    once: true, // Only runs one time when the bot successfully logs in
    async execute(client) {
        console.log(`✅ QFT Agent logged in as ${client.user.tag}`);
        
        // --- Load Settings and Set Initial Status ---
        SettingsHandler.loadSettings(); // Crucial step to load settings from file
        const savedStatus = SettingsHandler.get('status');

        if (savedStatus && savedStatus.text && savedStatus.type) {
            try {
                client.user.setPresence({
                    activities: [{ 
                        name: savedStatus.text, 
                        type: savedStatus.type
                    }],
                    status: savedStatus.status || 'online',
                });
                console.log(`[Status] Restored saved status: ${savedStatus.name} "${savedStatus.text}"`);
            } catch (error) {
                console.error('[Status] Error restoring saved status:', error);
                // Fallback to default if there's an error with the saved data
                client.user.setActivity('QFT Systems Online', { type: ActivityType.Watching });
            }
        } else {
            // Set a default status if none is saved
            client.user.setActivity('QFT Systems Online', { type: ActivityType.Watching });
            console.log('[Status] No saved status found, set to default.');
        }

        // Register slash commands for all guilds
        console.log('🔄 Registering custom slash commands...');
        const slashHandler = new SlashCommandHandler(client);
        
        for (const guild of client.guilds.cache.values()) {
            try {
                // Fetch commands for this guild from the API Gateway internal endpoint (bypass RBAC)
                const response = await fetch(`${API_URL}/api/internal/commands?guildId=${guild.id}&triggerType=slash`, {
                    headers: { 'x-internal-secret': INTERNAL_SECRET }
                });
                let commands = [];
                if (response.ok) {
                    const data = await response.json();
                    // API returns { success: true, commands: [...] }
                    if (data && Array.isArray(data.commands)) {
                        commands = data.commands;
                    } else {
                        commands = [];
                    }
                } else {
                    console.warn(`Could not fetch commands for guild ${guild.id}: ${response.status}`);
                }
                if (!Array.isArray(commands) || commands.length === 0) {
                    console.log(`No slash commands found for guild ${guild.id}`);
                }
                await slashHandler.registerSlashCommands(guild.id, commands);
            } catch (error) {
                console.error(`Error registering slash commands for ${guild.name}:`, error);
            }
        }
        
        console.log('✅ Slash command registration complete');
    },
};