// Discord data endpoints - fetch channels, roles, members
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const authenticateToken = require('../middleware/auth');

// RBAC middleware
const rbacMiddleware = (requiredRole) => (req, res, next) => {
    const userRole = req.user?.role || 'user';
    const roles = { owner: 3, admin: 2, staff: 1, user: 0 };
    if (roles[userRole] >= roles[requiredRole]) {
        return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
};

// Fetch guild channels
router.get('/guilds/:guildId/channels', authenticateToken, rbacMiddleware('user'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Discord Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guilds/${guildId}/channels`;
    console.log('[Discord Routes] Fetching channels from:', url);
    
    const response = await fetch(url, {
      headers: { 'Internal-Secret': secret }
    });
    
    console.log('[Discord Routes] Agent response status:', response.status);
    const text = await response.text();
    console.log('[Discord Routes] Agent response body:', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[Discord Routes] Failed to parse JSON from agent:', text.substring(0, 500));
      return res.status(500).json({ success: false, error: 'Invalid response from bot agent' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Discord Routes] Error fetching channels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch guild roles
router.get('/guilds/:guildId/roles', authenticateToken, rbacMiddleware('user'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Discord Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guilds/${guildId}/roles`;
    console.log('[Discord Routes] Fetching roles from:', url);
    
    const response = await fetch(url, {
      headers: { 'Internal-Secret': secret }
    });
    
    console.log('[Discord Routes] Agent response status:', response.status);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[Discord Routes] Failed to parse JSON from agent:', text.substring(0, 500));
      return res.status(500).json({ success: false, error: 'Invalid response from bot agent' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Discord Routes] Error fetching roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch guild members (paginated)
// Fetch all guilds the bot is a member of
router.get('/guilds', authenticateToken, rbacMiddleware('user'), async (req, res) => {
  try {
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Discord Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guilds`; // Calls the new qft-agent endpoint
    console.log('[Discord Routes] Fetching all bot guilds from:', url);
    
    const response = await fetch(url, {
      headers: { 'Internal-Secret': secret }
    });
    
    console.log('[Discord Routes] Agent response status (all guilds):', response.status);
    const text = await response.text();
    console.log('[Discord Routes] Agent response body (all guilds):', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('[Discord Routes] Failed to parse JSON from agent (all guilds):', text.substring(0, 500));
      return res.status(500).json({ success: false, error: 'Invalid response from bot agent' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Discord Routes] Error fetching all bot guilds:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch guilds the logged-in user is a member of
router.get('/user/guilds', authenticateToken, rbacMiddleware('user'), async (req, res) => {
  const { qft_uuid } = req.user;

  try {
    const db = require('../db'); // Import db here to avoid circular dependency if db imports routes

    // Retrieve user's discord_access_token from the database
    const userResult = await db.query(
      `SELECT discord_access_token FROM users WHERE qft_uuid = $1`,
      [qft_uuid]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].discord_access_token) {
      return res.status(404).json({ message: 'User or access token not found.' });
    }

    const userAccessToken = userResult.rows[0].discord_access_token;

    // Make a request to the Discord API to get the user's guilds
    const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });

    if (!discordResponse.ok) {
      console.error(`Discord API error: ${discordResponse.status} - ${discordResponse.statusText}`);
      return res.status(discordResponse.status).json({ message: 'Failed to fetch user guilds from Discord API.' });
    }

    const userGuilds = await discordResponse.json();
    res.json(userGuilds);

  } catch (error) {
    console.error('[Discord Routes] Error fetching user guilds:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route for Discord Rich Presence (RPC) updates
router.post('/rpc', authenticateToken, rbacMiddleware('user'), async (req, res) => {
    try {
        const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
        const secret = process.env.INTERNAL_BOT_SECRET;
        const { discordId, activity } = req.body; // Expecting discordId and activity object

        if (!secret) {
            console.error('[Discord Routes] INTERNAL_BOT_SECRET not set!');
            return res.status(500).json({ success: false, error: 'Internal configuration error' });
        }
        if (!discordId || !activity) {
            return res.status(400).json({ success: false, error: 'Missing discordId or activity in request body.' });
        }

        const url = `${botUrl}/api/user/${discordId}/rpc`;
        console.log(`[Discord Routes] Sending RPC update to bot agent for user ${discordId}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Internal-Secret': secret,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activity)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Discord Routes] Bot agent RPC error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ success: false, error: `Bot agent RPC failed: ${errorText}` });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('[Discord Routes] Error sending RPC update:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
