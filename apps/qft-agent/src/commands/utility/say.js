const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot repeat your message')
    .addStringOption(o => o.setName('text').setDescription('What to say').setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString('text');
    await interaction.reply({ content: '🗣️ Sent!', ephemeral: true });
    await interaction.channel.send({ content: text });
  }
};
