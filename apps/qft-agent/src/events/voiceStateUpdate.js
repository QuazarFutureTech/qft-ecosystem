const logService = require('../services/logService');
const workerService = require('../services/workerService');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        try {
            const guildId = newState.guild?.id;
            if (!guildId) return;

            const userId = newState.member?.id;
            if (!userId) return;

            // ===== VOICE JOIN EVENT =====
            if (!oldState.channel && newState.channel) {
                // User joined a voice channel
                try {
                    await logService.logAction(guildId, 'voice_join', userId, {
                        channelId: newState.channel.id,
                        channelName: newState.channel.name,
                    }, null, null, client);
                } catch (error) {
                    console.error('Error logging voice join:', error);
                }

                // Dispatch voice_join workers
                const payload = {
                    type: 'voice_join',
                    userId,
                    channelId: newState.channel.id,
                    channelName: newState.channel.name,
                };
                const workers = await workerService.getWorkersByTrigger(guildId, 'voice_join');
                for (const worker of workers) {
                    try {
                        await workerService.executeWorker(worker.id, guildId, payload, client);
                    } catch (error) {
                        console.error(`Error executing voice_join worker ${worker.id}:`, error);
                    }
                }
            }

            // ===== VOICE LEAVE EVENT =====
            else if (oldState.channel && !newState.channel) {
                // User left a voice channel
                try {
                    await logService.logAction(guildId, 'voice_leave', userId, {
                        channelId: oldState.channel.id,
                        channelName: oldState.channel.name,
                    }, null, null, client);
                } catch (error) {
                    console.error('Error logging voice leave:', error);
                }

                // Dispatch voice_leave workers
                const payload = {
                    type: 'voice_leave',
                    userId,
                    channelId: oldState.channel.id,
                    channelName: oldState.channel.name,
                };
                const workers = await workerService.getWorkersByTrigger(guildId, 'voice_leave');
                for (const worker of workers) {
                    try {
                        await workerService.executeWorker(worker.id, guildId, payload, client);
                    } catch (error) {
                        console.error(`Error executing voice_leave worker ${worker.id}:`, error);
                    }
                }
            }

            // ===== VOICE CHANNEL SWITCH =====
            else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                // User moved to a different voice channel
                try {
                    await logService.logAction(guildId, 'voice_switch', userId, {
                        oldChannelId: oldState.channel.id,
                        oldChannelName: oldState.channel.name,
                        newChannelId: newState.channel.id,
                        newChannelName: newState.channel.name,
                    }, null, null, client);
                } catch (error) {
                    console.error('Error logging voice switch:', error);
                }
            }

            // ===== MUTE/UNMUTE EVENTS =====
            if (oldState.selfMute !== newState.selfMute) {
                try {
                    await logService.logAction(guildId, 'voice_mute_toggle', userId, {
                        muted: newState.selfMute,
                        channelId: newState.channel?.id,
                        channelName: newState.channel?.name,
                    }, null, null, client);
                } catch (error) {
                    console.error('Error logging mute toggle:', error);
                }
            }

            // ===== DEAFEN/UNDEAFEN EVENTS =====
            if (oldState.selfDeaf !== newState.selfDeaf) {
                try {
                    await logService.logAction(guildId, 'voice_deaf_toggle', userId, {
                        deafened: newState.selfDeaf,
                        channelId: newState.channel?.id,
                        channelName: newState.channel?.name,
                    }, null, null, client);
                } catch (error) {
                    console.error('Error logging deafen toggle:', error);
                }
            }
        } catch (error) {
            console.error('Error in voiceStateUpdate event:', error);
        }
    },
};
