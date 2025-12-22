const fetch = require('node-fetch');
const logger = require('../utils/logger');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

async function getWorkersByTrigger(guildId, triggerType) {
    try {
        const response = await fetch(`${API_URL}/api/internal/workers?guildId=${guildId}&triggerType=${triggerType}`, {
            headers: {
                'x-internal-secret': INTERNAL_SECRET
            }
        });
        if (!response.ok) {
            logger.error(`[WorkerService] Failed to fetch workers: ${response.status}`);
            return [];
        }
        return await response.json();
    } catch (error) {
        logger.error('[WorkerService] Error fetching workers:', error.message);
        return [];
    }
}

async function executeWorker(workerOrId, guildId, payload, client) {
    try {
        let worker = workerOrId;
        
        // If ID passed, we would need to fetch it. For now assuming object.
        if (typeof workerOrId !== 'object') {
             logger.warn(`[WorkerService] executeWorker called with ID, fetching not implemented yet.`);
             return;
        }

        logger.info(`[WorkerService] Executing worker ${worker.worker_name} (${worker.id})`);

        const actions = worker.actions; // Array of actions
        if (!actions || !Array.isArray(actions)) return;

        const guild = await client.guilds.fetch(guildId);
        if (!guild) return;

        for (const action of actions) {
            try {
                await executeAction(action, guild, payload, client);
            } catch (err) {
                logger.error(`[WorkerService] Action failed: ${err.message}`);
            }
        }
        
    } catch (error) {
        logger.error(`[WorkerService] Execution failed: ${error.message}`);
    }
}

async function executeAction(action, guild, payload, client) {
    switch (action.type) {
        case 'send_message':
            // payload.channelId comes from the event (e.g. message create)
            if (payload.channelId) {
                const channel = await guild.channels.fetch(payload.channelId);
                if (channel && channel.isTextBased()) {
                    await channel.send(replaceVariables(action.params.message, payload));
                }
            }
            break;
        case 'add_role':
            if (payload.userId && action.params.roleId) {
                const member = await guild.members.fetch(payload.userId);
                if (member) await member.roles.add(action.params.roleId);
            }
            break;
        case 'remove_role':
            if (payload.userId && action.params.roleId) {
                const member = await guild.members.fetch(payload.userId);
                if (member) await member.roles.remove(action.params.roleId);
            }
            break;
        case 'dm_user':
            if (payload.userId) {
                const user = await client.users.fetch(payload.userId);
                if (user) await user.send(replaceVariables(action.params.message, payload));
            }
            break;
        default:
            logger.warn(`[WorkerService] Unknown action type: ${action.type}`);
    }
}

async function listWorkers(guildId, state) {
    try {
        const url = `${API_URL}/api/internal/workers?guildId=${guildId}${state ? '&state=' + state : ''}`;
        const response = await fetch(url, {
            headers: {
                'x-internal-secret': INTERNAL_SECRET
            }
        });
        if (!response.ok) {
            logger.error(`[WorkerService] Failed to list workers: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return data.workers || [];
    } catch (error) {
        logger.error('[WorkerService] Error listing workers:', error.message);
        return [];
    }
}

function replaceVariables(text, payload) {
    if (!text) return '';
    let result = text;
    // Simple variable replacement
    if (payload.user) result = result.replace(/{user}/g, payload.user.username);
    if (payload.userId) result = result.replace(/{user_id}/g, payload.userId);
    if (payload.content) result = result.replace(/{content}/g, payload.content);
    return result;
}

module.exports = {
    getWorkersByTrigger,
    executeWorker,
    listWorkers
};
