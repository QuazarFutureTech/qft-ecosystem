// Moderation endpoints - ban, kick, timeout users
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const authenticateToken = require('../middleware/auth');

// RBAC middleware - only staff and above can moderate
const rbacMiddleware = (requiredRole) => (req, res, next) => {
    const userRole = req.user?.role || 'user';
    const roles = { owner: 3, admin: 2, staff: 1, user: 0 };
    if (roles[userRole] >= roles[requiredRole]) {
        return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
};

// Ban a user from a guild
router.post('/guilds/:guildId/members/:userId/ban', authenticateToken, rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const { reason, deleteMessageDays = 0 } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }
    
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Moderation Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guild/${guildId}/moderation/ban`;
    console.log('[Moderation Routes] Banning user:', { guildId, userId, reason });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Internal-Secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        reason,
        deleteMessageDays,
        moderatorId: req.user.discord_id
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(response.status || 400).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Moderation Routes] Error banning user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kick a user from a guild
router.post('/guilds/:guildId/members/:userId/kick', authenticateToken, rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }
    
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Moderation Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guild/${guildId}/moderation/kick`;
    console.log('[Moderation Routes] Kicking user:', { guildId, userId, reason });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Internal-Secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        reason,
        moderatorId: req.user.discord_id
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(response.status || 400).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Moderation Routes] Error kicking user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Timeout a user in a guild
router.post('/guilds/:guildId/members/:userId/timeout', authenticateToken, rbacMiddleware('staff'), async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const { reason, duration = 60 } = req.body; // duration in minutes
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }
    
    const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
    const secret = process.env.INTERNAL_BOT_SECRET;
    
    if (!secret) {
      console.error('[Moderation Routes] INTERNAL_BOT_SECRET not set!');
      return res.status(500).json({ success: false, error: 'Internal configuration error' });
    }
    
    const url = `${botUrl}/api/guild/${guildId}/moderation/timeout`;
    console.log('[Moderation Routes] Timing out user:', { guildId, userId, reason, duration });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Internal-Secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        reason,
        duration,
        moderatorId: req.user.discord_id
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return res.status(response.status || 400).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('[Moderation Routes] Error timing out user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
