const workerService = require('../services/workerService');
const logService = require('../services/logService');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        // Ignore bot reactions
        if (user.bot) return;

        try {
            // Fetch full reaction if it's partial (from cache)
            if (reaction.partial) {
                await reaction.fetch();
            }

            const guildId = reaction.message.guildId;
            if (!guildId) return;

            // ===== DISPATCH REACTION-BASED WORKERS =====
            const workerTriggerPayload = {
                type: 'reaction',
                userId: user.id,
                messageId: reaction.message.id,
                channelId: reaction.message.channelId,
                emoji: reaction.emoji.name || reaction.emoji.id,
                emojiId: reaction.emoji.id || null,
                count: reaction.count,
            };

            // Get all reaction-type workers
            const workers = await workerService.getWorkersByTrigger(guildId, 'reaction');

            for (const worker of workers) {
                try {
                    // Check if this worker's emoji filter matches
                    const trigger = worker.trigger_config || {};
                    if (trigger.emoji && trigger.emoji !== workerTriggerPayload.emoji) {
                        continue; // Skip if emoji doesn't match
                    }

                    // Execute the worker
                    await workerService.executeWorker(worker.id, guildId, workerTriggerPayload, client);
                } catch (error) {
                    console.error(`Error executing reaction worker ${worker.id}:`, error);
                }
            }

            // ===== LOG REACTION ACTION (if configured) =====
            try {
                // Check if guild has reaction logging enabled
                const logChannelId = await logService.getLogChannelId(guildId, 'reactions');
                if (logChannelId) {
                    await logService.logAction(guildId, 'message_reaction', user.id, {
                        messageId: reaction.message.id,
                        emoji: workerTriggerPayload.emoji,
                        emojiId: workerTriggerPayload.emojiId,
                        channelId: reaction.message.channelId,
                        count: reaction.count,
                    }, null, null, client);
                }
            } catch (error) {
                console.error('Error logging reaction:', error);
            }
        } catch (error) {
            console.error('Error in messageReactionAdd event:', error);
        }
    },
};
