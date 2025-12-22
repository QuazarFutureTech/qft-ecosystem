const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

async function getTicket(ticketId) {
    // TODO: Implement API fetch
    return null;
}

async function createTicket(guildId, userId, title, description, ticketChannelId, client) {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error('Guild not found');

        const channel = await guild.channels.fetch(ticketChannelId);
        if (!channel) throw new Error('Ticket channel not found');
        
        const thread = await channel.threads.create({
            name: `Ticket-${Date.now().toString().slice(-4)}: ${title}`,
            autoArchiveDuration: 60,
            reason: `Ticket created by ${userId}`
        });
        
        await thread.send(`**Ticket Created**\nUser: <@${userId}>\nDescription: ${description}`);
        
        // Call API to save ticket
        const response = await fetch(`${API_URL}/api/internal/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET
            },
            body: JSON.stringify({
                guildId,
                userId,
                title,
                description,
                threadId: thread.id,
                status: 'open'
            })
        });
        
        if (!response.ok) {
             console.error(`[TicketService] Failed to save ticket: ${response.status}`);
             // Return success anyway since thread was created? Or fail?
             // Let's return success but warn.
             return { success: true, ticket: { id: 'temp', ticket_number: 'TEMP' }, threadId: thread.id };
        }
        
        const ticket = await response.json();
        return { success: true, ticket, threadId: thread.id };
        
    } catch (error) {
        console.error('[TicketService] Error creating ticket:', error);
        return { success: false, error: error.message };
    }
}

async function closeTicket(ticketId, threadId, client) {
    try {
        const thread = await client.channels.fetch(threadId).catch(() => null);
        if (thread) {
            await thread.setArchived(true, 'Ticket closed');
        }
        // TODO: Call API to update ticket status
    } catch (error) {
        console.error('[TicketService] Error closing ticket:', error);
    }
}

module.exports = {
    getTicket,
    createTicket,
    closeTicket
};
