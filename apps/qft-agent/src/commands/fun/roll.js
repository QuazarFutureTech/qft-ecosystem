const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a dice with N sides')
    .addIntegerOption(o => o.setName('sides').setDescription('Number of sides (2-1000)').setRequired(false)),
  async execute(interaction) {
    const sides = Math.min(Math.max(interaction.options.getInteger('sides') || 6, 2), 1000);
    const roll = Math.floor(Math.random() * sides) + 1;
    await interaction.reply({ content: `🎲 Rolled a **${roll}** (1-${sides})` });
  }
};
