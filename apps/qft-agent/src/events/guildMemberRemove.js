const ConfigManager = require('../utils/ConfigManager');
const logService = require('../services/logService');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member, client) {
        // Custom Command: user_leave trigger
        try {
            const CustomCommandHandler = require('../services/customCommandHandler');
            const handler = new CustomCommandHandler(client);
            const allCommands = await handler.getGuildCommandsCached(member.guild.id);
            const leaveCommands = allCommands.filter(cmd => cmd.trigger_type === 'leave');
            console.log(`[guildMemberRemove] [DEBUG] Loaded ${leaveCommands.length} leave trigger commands for guild: ${member.guild.id}`);
            for (const command of leaveCommands) {
                await handler.executeCommand(command, { member, guild: member.guild, user: member.user }, [], {});
                console.log(`[guildMemberRemove] [DEBUG] Executed leave trigger command: ${command.command_name} (${command.id}) for user: ${member.id}`);
            }
        } catch (err) {
            console.error('[CustomCommandHandler] Error handling leave trigger:', err);
        }
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
