const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays basic server information.'),
  async execute(interaction, client) {
    const g = interaction.guild;
    if (!g) return interaction.reply({ content: 'Guild info unavailable.', ephemeral: true });
    const lines = [
      `Name: ${g.name}`,
      `ID: ${g.id}`,
      `Members: ${g.memberCount}`,
      `Created: ${g.createdAt.toISOString()}`
    ];
    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
  }
};
