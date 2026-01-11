// apps/qft-api-gateway/src/routes/user.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const authenticateToken = require('../middleware/auth');

// API Gateway Internal Secret for communicating with the bot agent
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3002'; // Bot Agent's internal API URL

router.use(authenticateToken); // All user routes require authentication

/**
 * @route GET /api/v1/user/guilds
 * @description Fetches mutual guilds (guilds the authenticated user and the bot share).
 */
router.get('/guilds', async (req, res) => {
    // req.user should be populated by authenticateToken middleware
    const userId = req.user?.discord_id; 

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID not found in token.' });
    }

    if (!INTERNAL_BOT_SECRET) {
        return res.status(500).json({ success: false, message: 'Internal bot secret is not configured.' });
    }

    try {
        const botAgentResponse = await fetch(`${BOT_API_URL}/api/guilds/${userId}`, {
            method: 'GET',
            headers: {
                'internal-secret': INTERNAL_BOT_SECRET,
            },
        });
        const responseData = await botAgentResponse.json();

        if (!botAgentResponse.ok) {
            // Propagate bot agent's error status and message
            return res.status(botAgentResponse.status).json(responseData);
        }

        res.json({ success: true, guilds: responseData });
    } catch (error) {
        console.error(`[API Gateway] Error fetching mutual guilds for user ${userId} from bot agent:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch mutual guilds from bot agent.' });
    }
});

module.exports = router;