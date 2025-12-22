const Logger = require('../utils/logger');

class TicketManager {
    /**
     * Create a ticket thread in Discord
     * @param {Client} client Discord Client
     * @param {string} guildId Guild ID
     * @param {string} channelId Channel ID to spawn thread in
     * @param {string} userId User ID requesting ticket
     * @param {string} title Ticket Title
     * @param {string} description Ticket Description
     * @param {number} ticketNumber Ticket Number
     */
    async createTicketThread(client, guildId, channelId, userId, title, description, ticketNumber) {
        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) throw new Error('Guild not found');

            const channel = await guild.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) throw new Error('Invalid ticket channel');

            const threadName = `ticket-${ticketNumber}-${title.substring(0, 20).replace(/[^a-zA-Z0-9-]/g, '')}`;
            
            // Create private thread
            const thread = await channel.threads.create({
                name: threadName,
                type: 12, // GUILD_PRIVATE_THREAD (12) or GUILD_PUBLIC_THREAD (11) depending on boost level. 
                          // Note: Private threads require Level 2 boost or being a moderator. 
                          // For safety, let's use Public Thread (11) if Private fails, or just try Private.
                          // Actually, 'type' string 'GUILD_PRIVATE_THREAD' is deprecated in v14, use ChannelType.PrivateThread
                autoArchiveDuration: 1440,
                reason: `Ticket #${ticketNumber} created by user ${userId}`
            });

            // Add user to thread
            await thread.members.add(userId);

            // Send initial message
            await thread.send({
                content: `**Ticket #${ticketNumber}**\n**Title:** ${title}\n**Description:** ${description}\n\n<@${userId}>, a staff member will be with you shortly.`
            });

            return { success: true, threadId: thread.id, threadUrl: thread.url };
        } catch (error) {
            Logger.error('Failed to create ticket thread', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Close a ticket thread
     * @param {Client} client 
     * @param {string} threadId 
     */
    async closeTicketThread(client, threadId) {
        try {
            const thread = await client.channels.fetch(threadId);
            if (!thread || !thread.isThread()) throw new Error('Thread not found');

            await thread.setArchived(true, 'Ticket closed');
            return { success: true };
        } catch (error) {
            Logger.error('Failed to close ticket thread', { error: error.message });
            return { success: false, error: error.message };
        }
    }
}

module.exports = new TicketManager();
