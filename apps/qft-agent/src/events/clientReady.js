// src/events/clientReady.js
const { Events, ActivityType } = require('discord.js');
const SlashCommandHandler = require('../services/slashCommandHandler');
const SettingsHandler = require('../utils/SettingsHandler'); // Import SettingsHandler

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
                await slashHandler.registerSlashCommands(guild.id);
            } catch (error) {
                console.error(`Error registering slash commands for ${guild.name}:`, error);
            }
        }
        
        console.log('✅ Slash command registration complete');
    },
};