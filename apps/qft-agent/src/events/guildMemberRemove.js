const ConfigManager = require('../utils/ConfigManager');
const logService = require('../services/logService');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        const guildId = member.guild.id;
        const userId = member.id;

        // ===== LOG MEMBER LEAVE (Production) =====
        try {
            await logService.logAction(guildId, 'member_leave', 'system', {
                memberId: userId,
                username: member.user.username,
                leftAt: new Date().toISOString(),
                memberSinceDays: Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24)),
            }, userId, null, client);
        } catch (error) {
            console.error('Error logging member leave:', error);
        }

        // --- Original leave message ---
        const leave = ConfigManager.get(guildId, 'leave');
        if (!leave || !leave.channelId) return;
        const channel = member.guild.channels.cache.get(leave.channelId);
        if (!channel) return;

        const template = leave.template || '{user} has left {guild}.';
        const text = template.replace('{user}', `${member.user.tag}`).replace('{guild}', member.guild.name);
        channel.send({ content: text }).catch(() => {});
    }
};
