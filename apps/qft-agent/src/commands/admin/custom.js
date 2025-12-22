const { SlashCommandBuilder } = require('discord.js');
const ConfigManager = require('../../utils/ConfigManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('custom')
        .setDescription('Manage custom text commands for this guild')
        .addSubcommand(sc => sc.setName('create').setDescription('Create a custom command')
            .addStringOption(o => o.setName('name').setDescription('Command trigger').setRequired(true))
            .addStringOption(o => o.setName('response').setDescription('Text response').setRequired(true))
            .addIntegerOption(o => o.setName('cooldown').setDescription('Cooldown in seconds (optional)'))
            .addRoleOption(o => o.setName('role').setDescription('Role required to use this command (optional)')))
        .addSubcommand(sc => sc.setName('delete').setDescription('Delete a custom command')
            .addStringOption(o => o.setName('name').setDescription('Command trigger').setRequired(true))),

    category: 'custom',

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (sub === 'create') {
            const name = interaction.options.getString('name').toLowerCase();
            const response = interaction.options.getString('response');
            const cooldown = interaction.options.getInteger('cooldown') || 0;
            const role = interaction.options.getRole('role');

            const cmds = ConfigManager.get(guildId, 'customCommands', {});
            cmds[name] = { response, createdAt: Date.now(), cooldown: cooldown, roleId: role?.id || null };
            ConfigManager.set(guildId, 'customCommands', cmds);
            await interaction.reply({ content: `Custom command "${name}" created.`, ephemeral: true });
        } else if (sub === 'delete') {
            const name = interaction.options.getString('name').toLowerCase();
            const cmds = ConfigManager.get(guildId, 'customCommands', {});
            if (cmds[name]) {
                delete cmds[name];
                ConfigManager.set(guildId, 'customCommands', cmds);
                await interaction.reply({ content: `Deleted custom command ${name}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `No such custom command: ${name}`, ephemeral: true });
            }
        }
    }
};
