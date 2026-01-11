const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete recent messages (max 100)')
    .addIntegerOption(o => o.setName('amount').setDescription('How many messages to delete (2-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const amount = Math.min(Math.max(interaction.options.getInteger('amount') || 0, 2), 100);
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'I need Manage Messages to purge.', ephemeral: true });
    }
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);
    if (!deleted) return interaction.reply({ content: 'Unable to delete messages (they might be too old).', ephemeral: true });
    await interaction.reply({ content: `🧹 Deleted ${deleted.size} messages.`, ephemeral: true });
  }
};
