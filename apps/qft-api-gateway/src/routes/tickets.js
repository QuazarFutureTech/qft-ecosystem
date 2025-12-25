// routes/tickets.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const ticketService = require('../services/ticketService');

// RBAC middleware (similar to moderation.js)
const rbacMiddleware = (requiredRole) => (req, res, next) => {
    const userRole = req.user?.role || 'user';
    const roles = { owner: 3, admin: 2, staff: 1, user: 0 };
    if (roles[userRole] >= roles[requiredRole]) {
        return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
};


// List tickets for a guild.
// Users can see their own tickets. Staff can see all tickets.
router.get('/guilds/:guildId/tickets', authenticateToken, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { status } = req.query;
        const userDiscordId = req.user.discord_id;
        const isStaff = req.user.all_roles && req.user.all_roles.includes('staff');

        let tickets;
        if (isStaff) {
            // Staff can see all tickets for the guild
            tickets = await ticketService.listTickets(guildId, status);
        } else {
            // Regular users only see their own tickets for the guild
            tickets = await ticketService.listTicketsForUser(guildId, userDiscordId, status);
        }

        res.json(tickets);
    } catch (error) {
        console.error(`[Ticket Routes] Error listing tickets:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;
