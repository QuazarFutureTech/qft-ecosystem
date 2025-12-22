const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const MINUTES_TO_MS = 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Times out a member for a duration.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to time out.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('Duration in minutes (Max 40320 / 4 weeks).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    // FIX APPLIED: Accepts the client object
    async execute(interaction, client) { 
        const targetMember = interaction.options.getMember('target');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const ms = minutes * MINUTES_TO_MS;

        if (!targetMember) {
            return interaction.reply({ content: '❌ That user is not a member of this server.', ephemeral: true });
        }
        
        // Timeout duration check (Discord max is 4 weeks)
        if (minutes < 1 || minutes > 40320) { 
             return interaction.reply({ content: '❌ Timeout duration must be between 1 minute and 4 weeks (40320 minutes).', ephemeral: true });
        }

        // Check 1: Bot's authority
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
             return interaction.reply({ content: `❌ I cannot time out **${targetMember.user.tag}** due to role hierarchy.`, ephemeral: true });
        }

        try {
            await targetMember.timeout(ms, reason);
            await interaction.reply(`⏳ **${targetMember.user.tag}** has been timed out for **${minutes} minutes**. Reason: ${reason}`);
        } catch (error) {
            console.error('Timeout Error:', error);
            await interaction.reply({ content: '❌ Failed to time out the member.', ephemeral: true });
        }
    },
};