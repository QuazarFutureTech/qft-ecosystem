const CustomCommandHandler = require('../services/customCommandHandler');
const ConfigManager = require('../utils/ConfigManager');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        // Ignore bots and unchanged content
        if (newMessage.author?.bot || oldMessage.content === newMessage.content) return;
        const guildId = newMessage.guildId;
        if (!guildId) return;
        try {
            const handler = new CustomCommandHandler(client);
            const allCommands = await handler.getGuildCommandsCached(guildId);
            // Run commands with trigger_type 'edit' or trigger_on_edit true
            const editCommands = allCommands.filter(cmd => cmd.trigger_type === 'edit' || cmd.trigger_on_edit);
            console.log(`[messageUpdate] [DEBUG] Loaded ${editCommands.length} edit trigger commands for guild: ${guildId}`);
            for (const command of editCommands) {
                await handler.executeCommand(command, newMessage, [], {});
                console.log(`[messageUpdate] [DEBUG] Executed edit trigger command: ${command.command_name} (${command.id}) for message: ${newMessage.id}`);
            }
        } catch (err) {
            console.error('[CustomCommandHandler] Error handling edit trigger:', err);
        }
    }
};
