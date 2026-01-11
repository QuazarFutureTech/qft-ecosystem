// qft-agent/src/commands/utility/setprefix.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Set the command prefix for this server')
    .addStringOption(option =>
      option
        .setName('prefix')
        .setDescription('New prefix (1-5 chars)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  async execute(interaction) {
    const prefix = interaction.options.getString('prefix');
    
    if (!prefix || prefix.length > 5) {
      return interaction.reply({ content: 'Prefix must be 1-5 characters.', ephemeral: true });
    }

    try {
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const internalSecret = process.env.INTERNAL_BOT_SECRET;
      
      const response = await fetch(`${apiUrl}/api/v1/guilds/${interaction.guildId}/settings/prefix`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret 
        },
        body: JSON.stringify({ prefix }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await interaction.reply({ content: `✅ Prefix set to \`${prefix}\``, ephemeral: true });
    } catch (error) {
      console.error('[setprefix]', error);
      await interaction.reply({ content: 'Failed to update prefix.', ephemeral: true });
    }
  },
};
