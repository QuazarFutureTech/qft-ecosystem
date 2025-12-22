// Guild data endpoints for bot
const express = require('express');
const router = express.Router();

const internalAuth = (req, res, next) => {
    const secret = req.headers['x-internal-secret'] || req.headers['internal-secret'];
    if (secret !== process.env.INTERNAL_BOT_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// Get guild channels
router.get('/guild/:guildId/channels', internalAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const guild = req.app.locals.client?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        const channels = guild.channels.cache
            .filter(c => c.type !== 4) // Exclude categories
            .map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                typeLabel: getChannelTypeLabel(c.type),
                parent: c.parentId,
                position: c.position
            }))
            .sort((a, b) => a.position - b.position);
        
        res.json({ success: true, channels });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get guild roles
router.get('/guild/:guildId/roles', internalAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const guild = req.app.locals.client?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        const roles = guild.roles.cache
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor,
                position: r.position,
                managed: r.managed,
                mentionable: r.mentionable
            }))
            .sort((a, b) => b.position - a.position);
        
        res.json({ success: true, roles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get guild members
router.get('/guild/:guildId/members', internalAuth, async (req, res) => {
    try {
        const { guildId } = req.params;
        const { limit = 100, includeRoles = 'false' } = req.query;
        const guild = req.app.locals.client?.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        // Fetch all members if not cached
        if (guild.memberCount > guild.members.cache.size) {
            await guild.members.fetch();
        }
        
        const members = guild.members.cache
            .map(m => {
                const member = {
                    userId: m.user.id,
                    username: m.user.username,
                    discriminator: m.user.discriminator,
                    displayName: m.displayName,
                    bot: m.user.bot,
                    avatar: m.user.displayAvatarURL()
                };
                
                // Include roles if requested
                if (includeRoles === 'true') {
                    member.roles = m.roles.cache
                        .filter(r => r.id !== guildId) // Exclude @everyone role
                        .map(r => ({
                            id: r.id,
                            name: r.name,
                            color: r.hexColor
                        }));
                }
                
                return member;
            })
            .slice(0, parseInt(limit));
        
        res.json({ success: true, members, total: guild.memberCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function getChannelTypeLabel(type) {
    const types = {
        0: 'Text',
        2: 'Voice',
        5: 'Announcement',
        10: 'News Thread',
        11: 'Public Thread',
        12: 'Private Thread',
        13: 'Stage',
        15: 'Forum'
    };
    return types[type] || 'Unknown';
}

module.exports = router;
