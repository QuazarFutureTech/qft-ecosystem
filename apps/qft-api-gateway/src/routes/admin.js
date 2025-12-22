const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Note: You might need to adjust what constitutes an "admin user"
// For now, let's assume anyone with a role other than 'level_0_standard' is a managed user.
router.get('/users', authenticateToken, async (req, res) => {
    try {
        // This is a placeholder. We need to define what an "admin user" is.
        // Is it based on qft_role? Let's assume so for now.
        const users = await db.query(
            `SELECT qft_uuid as id, username as name, email, qft_role as clearance, 'Active' as status 
             FROM users 
             WHERE qft_role != 'level_0_standard'
             ORDER BY username`
        );
        res.json(users.rows);
    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ message: 'Failed to retrieve admin users.' });
    }
});

// This is a placeholder for a 'logs' table that we need to create.
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        // We will need a 'system_logs' table in the database.
        // Let's assume it has columns: id, timestamp, type, message
        const logs = await db.query(
            `SELECT id, timestamp, type, message 
             FROM system_logs 
             ORDER BY timestamp DESC 
             LIMIT 50`
        );
        res.json(logs.rows);
    } catch (error) {
        console.error('Error fetching system logs:', error);
        // If the table doesn't exist, this will fail. We should handle that gracefully.
        if (error.code === '42P01') { // 'undefined_table' error in PostgreSQL
            return res.json([]); // Return empty array if table doesn't exist yet
        }
        res.status(500).json({ message: 'Failed to retrieve system logs.' });
    }
});

// Get Guild Roles (Proxy to Bot)
router.get('/guilds/:guildId/roles', authenticateToken, async (req, res) => {
    try {
        const { guildId } = req.params;
        const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
        const response = await fetch(`${botUrl}/api/guilds/${guildId}/roles`, {
            headers: { 'Internal-Secret': process.env.INTERNAL_BOT_SECRET }
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error fetching guild roles:', error);
        res.status(500).json({ message: 'Failed to fetch guild roles.' });
    }
});

// Update Member Role (Proxy to Bot)
router.put('/guilds/:guildId/members/:userId/roles', authenticateToken, async (req, res) => {
    try {
        const { guildId, userId } = req.params;
        const { roleId } = req.body;
        const botUrl = process.env.BOT_API_URL || 'http://localhost:3002';
        const response = await fetch(`${botUrl}/api/guilds/${guildId}/members/${userId}/roles`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Internal-Secret': process.env.INTERNAL_BOT_SECRET 
            },
            body: JSON.stringify({ roleId })
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json({ message: 'Failed to update member role.' });
    }
});

module.exports = router;
