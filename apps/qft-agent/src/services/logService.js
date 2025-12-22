const { EmbedBuilder } = require('discord.js');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

/**
 * Log an action to the database (via API) and to a Discord channel.
 * @param {string} guildId 
 * @param {string} actionType 
 * @param {string} executorId 
 * @param {object} details 
 * @param {string} targetId 
 * @param {string} ticketId 
 * @param {object} client - Discord Client
 */
async function logAction(guildId, actionType, executorId, details, targetId, ticketId, client) {
    // 1. Send to API Gateway to save to DB
    try {
        // Use native fetch (Node 18+)
        const response = await fetch(`${API_URL}/api/internal/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': INTERNAL_SECRET
            },
            body: JSON.stringify({
                guildId,
                actionType,
                executorId,
                details,
                targetId
            })
        });
        
        if (!response.ok) {
            console.error(`[LogService] Failed to save log to API Gateway: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('[LogService] Error calling API Gateway for logging:', error.message);
    }

    // 2. Send to Discord Channel
    if (client) {
        try {
            await sendToLogChannel(guildId, actionType, { ...details, executorId, targetId }, client);
        } catch (error) {
            console.error('[LogService] Error sending log to Discord channel:', error);
        }
    }
}

async function sendToLogChannel(guildId, actionType, logData, client) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    // TODO: Fetch configured log channel ID from API instead of hardcoded name
    // For now, fallback to finding a channel named 'qft-logs'
    const channel = guild.channels.cache.find(c => c.name === 'qft-logs');
    
    if (!channel) {
        // Optionally create it? No, let's just return for now to avoid spamming channel creation
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(`Audit Log: ${actionType}`)
        .setColor(getColorForAction(actionType))
        .setTimestamp();

    let description = `**Executor:** <@${logData.executorId}>\n`;
    if (logData.targetId) description += `**Target:** <@${logData.targetId}>\n`;
    
    // Add other details
    for (const [key, value] of Object.entries(logData)) {
        if (key !== 'executorId' && key !== 'targetId' && key !== 'actionType') {
            let valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            if (valStr.length > 1000) valStr = valStr.substring(0, 1000) + '...';
            description += `**${key}:** ${valStr}\n`;
        }
    }

    embed.setDescription(description);

    await channel.send({ embeds: [embed] });
}

function getColorForAction(actionType) {
    if (actionType.includes('ban') || actionType.includes('kick')) return 0xFF0000; // Red
    if (actionType.includes('update')) return 0xFFA500; // Orange
    if (actionType.includes('create')) return 0x00FF00; // Green
    if (actionType.includes('delete')) return 0x808080; // Grey
    return 0x0099FF; // Blue
}

module.exports = {
    logAction
};
