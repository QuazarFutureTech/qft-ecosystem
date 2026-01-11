const workerService = require('../services/workerService');
const logService = require('../services/logService');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        console.log('[messageReactionAdd][DEBUG] Event fired:', {
            userId: user?.id,
            messageId: reaction?.message?.id,
            guildId: reaction?.message?.guildId,
            emoji: reaction?.emoji?.name || reaction?.emoji?.id,
            messagePartial: reaction?.message?.partial,
            reactionPartial: reaction?.partial,
            messageChannelId: reaction?.message?.channelId,
            messageCreatedTimestamp: reaction?.message?.createdTimestamp,
            messageAuthorId: reaction?.message?.author?.id,
            messageContent: reaction?.message?.content,
            messageFetched: !!reaction?.message,
            reactionFetched: !!reaction,
        });
        // Custom Command: reaction trigger
        try {
            const CustomCommandHandler = require('../services/customCommandHandler');
            const handler = new CustomCommandHandler(client);
            const guildId = reaction.message.guildId;
            if (!guildId) {
                console.log('[messageReactionAdd][DEBUG] No guildId found on reaction.message.');
                return;
            }
            // --- Message partial fetch logic (deactivated, save for future AI Workers use) ---
            // if (reaction.message.partial) {
            //     console.log('[messageReactionAdd][DEBUG] Message is partial, attempting forced fetch...');
            // }
            // let message = reaction.message;
            // if (message.partial) {
            //     try {
            //         message = await message.fetch();
            //         console.log('[messageReactionAdd][DEBUG] Forced fetch of partial message succeeded:', {
            //             id: message.id,
            //             content: message.content,
            //             author: message.author?.id,
            //             createdTimestamp: message.createdTimestamp
            //         });
            //     } catch (e) {
            //         console.error('[messageReactionAdd][DEBUG] Failed to fetch partial message:', e);
            //     }
            // }
            let message = reaction.message;
            const allCommands = await handler.getGuildCommandsCached(guildId);
            const reactionCommands = allCommands.filter(cmd => cmd.trigger_type === 'reaction');
            console.log(`[messageReactionAdd][DEBUG] Loaded ${reactionCommands.length} reaction trigger commands for guild: ${guildId}`);
            for (const command of reactionCommands) {
                // YAGPDB-style: If no emoji specified, match any emoji
                let shouldRun = true;
                if (command.trigger_data && command.trigger_data.emoji) {
                    const emoji = reaction.emoji.name || reaction.emoji.id;
                    console.log(`[messageReactionAdd][DEBUG] Command ${command.command_name} expects emoji: ${command.trigger_data.emoji}, got: ${emoji}`);
                    if (emoji !== command.trigger_data.emoji) shouldRun = false;
                } else {
                    console.log(`[messageReactionAdd][DEBUG] Command ${command.command_name} has no emoji restriction, will match any emoji.`);
                }
                if (shouldRun) {
                    console.log(`[messageReactionAdd][DEBUG] Executing command: ${command.command_name} (${command.id}) for user: ${user.id}`);
                    // Build reaction-specific context
                    const reactionContext = {
                        Reaction: {
                            Emoji: {
                                Name: reaction.emoji.name,
                                ID: reaction.emoji.id,
                                APIName: reaction.emoji.identifier,
                                Animated: reaction.emoji.animated || false
                            },
                            Count: reaction.count
                        },
                        ReactionMessage: message,
                        User: {
                            ID: user.id,
                            Username: user.username,
                            Mention: `<@${user.id}>`
                        }
                    };
                    await handler.executeCommand(command, message, [], reactionContext);
                }
            }
        } catch (err) {
            console.error('[CustomCommandHandler] Error handling reaction trigger:', err);
        }
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
                // Only attempt logging if logService.logAction exists and client is defined
                if (typeof logService.logAction === 'function' && client) {
                    await logService.logAction(guildId, 'message_reaction', user.id, {
                        messageId: reaction.message.id,
                        emoji: workerTriggerPayload.emoji,
                        emojiId: workerTriggerPayload.emojiId,
                        channelId: reaction.message.channelId,
                        count: reaction.count,
                    }, null, null, client);
                } else {
                    console.warn('[messageReactionAdd][DEBUG] Skipping logAction: logService.logAction or client missing.');
                }
            } catch (error) {
                console.error('Error logging reaction:', error);
            }
        } catch (error) {
            console.error('Error in messageReactionAdd event:', error);
        }
    },
};
