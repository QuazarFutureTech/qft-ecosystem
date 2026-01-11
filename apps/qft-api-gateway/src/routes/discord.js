
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002'; // Bot Agent's internal API URL


const authenticateToken = require('../middleware/auth');
if (!INTERNAL_BOT_SECRET) {
    console.error('CRITICAL ERROR: INTERNAL_BOT_SECRET is not defined in API Gateway. Cannot communicate with bot agent.');
}
// Middleware to ensure token authentication for external access
router.use(authenticateToken);

/**
 * @route GET /api/v1/discord/guilds/:guildId/roles
 * @description Fetches all roles for a guild from the bot agent.
 */
router.get('/guilds/:guildId/roles', async (req, res) => {
    const { guildId } = req.params;
    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }
    try {
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/roles`, {
            method: 'GET',
            headers: {
                'internal-secret': INTERNAL_BOT_SECRET,
            },
        });
        const responseData = await botAgentResponse.json();
        if (!botAgentResponse.ok) {
            return res.status(botAgentResponse.status).json(responseData);
        }
        res.json(responseData);
    } catch (error) {
        console.error(`[API Gateway] Error fetching roles for guild ${guildId} from bot agent:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch roles from bot agent.' });
    }
});

/**
 * @route GET /api/v1/discord/guilds
 * @description Fetches all guilds from the bot agent.
 */
router.get('/guilds', async (req, res) => {
    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }
    try {
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds`, {
            method: 'GET',
            headers: {
                'internal-secret': INTERNAL_BOT_SECRET,
            },
        });
        const responseData = await botAgentResponse.json();
        if (!botAgentResponse.ok) {
            return res.status(botAgentResponse.status).json(responseData);
        }
        res.json(responseData);
    } catch (error) {
        console.error(`[API Gateway] Error fetching guilds from bot agent:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch guilds from bot agent.' });
    }
});

/**
 * @route GET /api/v1/discord/guilds/:guildId/channels
 * @description Fetches all channels for a guild from the bot agent.
 */
router.get('/guilds/:guildId/channels', async (req, res) => {
    const { guildId } = req.params;
    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }
    try {
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/channels`, {
            method: 'GET',
            headers: {
                'internal-secret': INTERNAL_BOT_SECRET,
            },
        });
        const responseData = await botAgentResponse.json();
        if (!botAgentResponse.ok) {
            return res.status(botAgentResponse.status).json(responseData);
        }
        res.json(responseData);
    } catch (error) {
        console.error(`[API Gateway] Error fetching channels for guild ${guildId} from bot agent:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch channels from bot agent.' });
    }
});

/**
 * @route POST /api/v1/discord/rpc
 * @description Forwards an RPC activity request from the frontend to the bot agent.
 * @access Authenticated Users (via JWT from frontend)
 */
router.post('/rpc', async (req, res) => {
    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }
    try {
        // Forward the request to the qft-agent's internal API
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/discord/rpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'internal-secret': INTERNAL_BOT_SECRET,
            },
            body: JSON.stringify(req.body),
        });
        const responseData = await botAgentResponse.json();
        if (!botAgentResponse.ok) {
            return res.status(botAgentResponse.status).json(responseData);
        }
        res.json(responseData);
    } catch (error) {
        console.error(`[API Gateway] Error forwarding RPC activity to bot agent:`, error);
        res.status(500).json({ success: false, message: 'Failed to forward RPC activity to bot agent.' });
    }
});

/**
 * @route POST /api/v1/discord/guilds/:guildId/channels/:channelId/embed
 * @description Forwards an embed posting request from the frontend to the bot agent.
 * @access Authenticated Users (via JWT from frontend)
 */
router.post('/guilds/:guildId/channels/:channelId/embed', async (req, res) => {
    const { guildId, channelId } = req.params;
    const embedData = req.body; // This contains the embed object and components

    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }

    try {
        // Forward the request to the qft-agent's internal API
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/channels/${channelId}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'internal-secret': INTERNAL_BOT_SECRET, // Authenticate with the bot agent
            },
            body: JSON.stringify(embedData),
        });

        const responseData = await botAgentResponse.json();

        if (!botAgentResponse.ok) {
            // If bot agent returns an error, propagate it back to the frontend
            return res.status(botAgentResponse.status).json(responseData);
        }

        // If successful, return the bot agent's response
        res.json(responseData);

    } catch (error) {
        console.error(`[API Gateway] Error forwarding embed to bot agent for guild ${guildId}, channel ${channelId}:`, error);
        res.status(500).json({ success: false, message: 'Failed to forward embed request to bot agent.' });
    }
});

module.exports = router;