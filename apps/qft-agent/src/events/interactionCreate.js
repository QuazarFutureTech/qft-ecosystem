const logService = require('../services/logService');
const ticketService = require('../services/ticketService');
const SlashCommandHandler = require('../services/slashCommandHandler');
const ComponentListenerHandler = require('../services/componentListenerHandler');
const ConfigManager = require('../utils/ConfigManager');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // --- Component Handlers (Buttons, Modals, Select Menus) ---
        if (interaction.isButton()) {
            const componentHandler = new ComponentListenerHandler(client);
            await componentHandler.handleButton(interaction);
            return;
        }
        if (interaction.isModalSubmit()) {
            const componentHandler = new ComponentListenerHandler(client);
            await componentHandler.handleModal(interaction);
            return;
        }
        if (interaction.isStringSelectMenu()) {
            const componentHandler = new ComponentListenerHandler(client);
            await componentHandler.handleSelectMenu(interaction);
            return;
        }

        // --- Slash Command Dispatcher ---
        if (interaction.isChatInputCommand()) {
            const commandName = interaction.commandName;
            const command = client.commands.get(commandName);

            // --- 1. Built-in Command Execution ---
            if (command) {
                // Check category toggles for built-in commands
                const guildId = interaction.guildId;
                const category = command.category || 'general';
                if (guildId && !ConfigManager.isCategoryEnabled(guildId, category)) {
                    return interaction.reply({ content: 'This command category is disabled in this guild.', ephemeral: true });
                }

                try {
                    await command.execute(interaction, client);
                    // Log execution
                    logService.logAction(guildId, 'slash_command', interaction.user.id, {
                        commandName: commandName,
                        type: 'built-in',
                        status: 'executed',
                    }).catch(console.error);

                } catch (error) {
                    console.error(`Error executing built-in command ${commandName}:`, error);
                    logService.logAction(guildId, 'slash_command', interaction.user.id, {
                        commandName: commandName,
                        type: 'built-in',
                        status: 'error',
                        error: error.message,
                    }).catch(console.error);
                    
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: '❌ An execution error occurred with this built-in command!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ An execution error occurred with this built-in command!', ephemeral: true });
                    }
                }
            }
            // --- 2. Custom Command Handling (Fallback) ---
            else {
                const slashHandler = new SlashCommandHandler(client);
                await slashHandler.handleInteraction(interaction);
            }
        }
    },
};