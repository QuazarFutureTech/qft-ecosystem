// src/commands/moderation/kick.js

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),

    // FIX APPLIED: Accepts the client object (though not explicitly needed here, it maintains consistent signature)
    async execute(interaction, client) { 
        // We use .getMember() to ensure the target is currently in the guild
        const targetMember = interaction.options.getMember('target'); 
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check 1: Ensure the target is actually a member
        if (!targetMember) {
            return interaction.reply({ content: '❌ That user is not a member of this server.', ephemeral: true });
        }
        
        // Check 2: Check if the bot has the authority (role hierarchy)
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: `❌ I cannot kick **${targetMember.user.tag}** because their highest role is equal to or higher than mine.`, ephemeral: true });
        }

        try {
            await targetMember.kick(reason);
            await interaction.reply(`👢 **${targetMember.user.tag}** has been kicked. Reason: ${reason}`);
        } catch (error) {
            console.error('Kick Error:', error);
            await interaction.reply({ content: '❌ Failed to kick the member due to a Discord API error.', ephemeral: true });
        }
    },
};