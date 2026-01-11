const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Shows information about a user')
    .addUserOption(o => o.setName('target').setDescription('User to inspect').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const lines = [
      `Tag: ${user.tag}`,
      `ID: ${user.id}`,
      `Bot: ${user.bot}`,
      `Created: ${user.createdAt.toISOString()}`
    ];
    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
  }
};
