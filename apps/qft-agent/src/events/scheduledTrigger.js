const CustomCommandHandler = require('../services/customCommandHandler');

module.exports = {
    name: 'scheduledTrigger',
    async execute(triggerConfig, client) {
        // triggerConfig: { guildId, commandId, ... }
        try {
            const handler = new CustomCommandHandler(client);
            const allCommands = await handler.getGuildCommandsCached(triggerConfig.guildId);
            // Find scheduled commands (optionally by commandId)
            const scheduledCommands = allCommands.filter(cmd => cmd.trigger_type === 'scheduled' && (!triggerConfig.commandId || cmd.id === triggerConfig.commandId));
            console.log(`[scheduledTrigger] [DEBUG] Loaded ${scheduledCommands.length} scheduled trigger commands for guild: ${triggerConfig.guildId}`);
            for (const command of scheduledCommands) {
                await handler.executeCommand(command, triggerConfig, [], {});
                console.log(`[scheduledTrigger] [DEBUG] Executed scheduled trigger command: ${command.command_name} (${command.id}) for guild: ${triggerConfig.guildId}`);
            }
        } catch (err) {
            console.error('[CustomCommandHandler] Error handling scheduled trigger:', err);
        }
    }
};
