// src/commands/moderation/ban.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    // FIX APPLIED: Accepts the client object
    async execute(interaction, client) { 
        // We use getUser() because we can ban users who are NOT currently in the guild
        const targetUser = interaction.options.getUser('target'); 
        const targetMember = interaction.guild.members.cache.get(targetUser.id);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check 1: Check bot's authority (only if they are currently a member)
        if (targetMember && targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: `❌ I cannot ban **${targetUser.tag}** because their highest role is equal to or higher than mine.`, ephemeral: true });
        }

        try {
            // Note: ban() takes the user ID, not the member object
            await interaction.guild.members.ban(targetUser.id, { reason: reason });
            await interaction.reply(`🔨 **${targetUser.tag}** has been banned. Reason: ${reason}`);
        } catch (error) {
            console.error('Ban Error:', error);
            await interaction.reply({ content: '❌ An error occurred while trying to ban the user.', ephemeral: true });
        }
    },
};