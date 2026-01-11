const { SlashCommandBuilder } = require('discord.js');
const SlashCommandHandler = require('../../services/slashCommandHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_slash_commands')
    .setDescription('Remove all custom slash commands for this guild (admin only)'),
  category: 'admin',
  async execute(interaction) {
    // Only allow server owner or users with ADMINISTRATOR permission
    if (!interaction.member.permissions.has('Administrator') && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    const guildId = interaction.guildId;
    const handler = new SlashCommandHandler(interaction.client);
    await handler.clearSlashCommands(guildId);
    await interaction.reply({ content: 'All custom slash commands have been removed for this guild.', ephemeral: true });
  }
};
