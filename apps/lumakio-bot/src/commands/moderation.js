const { PermissionsBitField, EmbedBuilder } = require('discord.js');

function hasPermissions(member, perms) {
  return member.permissions.has(perms);
}

module.exports = [
  {
    name: 'kick',
    description: 'Kick a user from the server',
    category: 'moderation',
    slash: {
      name: 'kick',
      description: 'Kick a user from the server',
      options: [
        { name: 'user', description: 'User to kick', type: 6, required: true },
        { name: 'reason', description: 'Reason', type: 3, required: false },
      ],
    },
    async executeSlash(interaction) {
      if (!hasPermissions(interaction.member, PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({ content: 'You lack the Kick Members permission.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
      await member.kick(reason);
      await interaction.reply({ content: `👢 Kicked ${user.tag}. Reason: ${reason}`, ephemeral: true });
    },
    async executeMessage(message, _client, args) {
      if (!hasPermissions(message.member, PermissionsBitField.Flags.KickMembers)) {
        return message.reply('You lack the Kick Members permission.');
      }
      const user = message.mentions.users.first();
      const reason = args.slice(1).join(' ') || 'No reason provided';
      if (!user) return message.reply('Please mention a user to kick.');
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply('User not found in this server.');
      await member.kick(reason);
      await message.reply(`👢 Kicked ${user.tag}. Reason: ${reason}`);
    },
  },
  {
    name: 'ban',
    description: 'Ban a user from the server',
    category: 'moderation',
    slash: {
      name: 'ban',
      description: 'Ban a user from the server',
      options: [
        { name: 'user', description: 'User to ban', type: 6, required: true },
        { name: 'reason', description: 'Reason', type: 3, required: false },
        { name: 'days', description: 'Delete days of messages (0-7)', type: 4, required: false },
      ],
    },
    async executeSlash(interaction) {
      if (!hasPermissions(interaction.member, PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ content: 'You lack the Ban Members permission.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const delDays = interaction.options.getInteger('days') ?? 0;
      await interaction.guild.members.ban(user.id, { reason, deleteMessageDays: delDays }).catch(() => null);
      await interaction.reply({ content: `🔨 Banned ${user.tag}. Reason: ${reason}`, ephemeral: true });
    },
    async executeMessage(message, _client, args) {
      if (!hasPermissions(message.member, PermissionsBitField.Flags.BanMembers)) {
        return message.reply('You lack the Ban Members permission.');
      }
      const user = message.mentions.users.first();
      const reason = args.slice(1).join(' ') || 'No reason provided';
      if (!user) return message.reply('Please mention a user to ban.');
      await message.guild.members.ban(user.id, { reason }).catch(() => null);
      await message.reply(`🔨 Banned ${user.tag}. Reason: ${reason}`);
    },
  },
  {
    name: 'timeout',
    description: 'Timeout a user for a duration',
    category: 'moderation',
    slash: {
      name: 'timeout',
      description: 'Timeout a user for a duration',
      options: [
        { name: 'user', description: 'User to timeout', type: 6, required: true },
        { name: 'minutes', description: 'Minutes to timeout (max 10080)', type: 4, required: true },
        { name: 'reason', description: 'Reason', type: 3, required: false },
      ],
    },
    async executeSlash(interaction) {
      if (!hasPermissions(interaction.member, PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: 'You lack the Moderate Members permission.', ephemeral: true });
      }
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
      const ms = Math.min(minutes, 10080) * 60 * 1000; // cap at 7 days
      await member.timeout(ms, reason).catch(() => null);
      await interaction.reply({ content: `⏲️ Timed out ${user.tag} for ${minutes} minutes.`, ephemeral: true });
    },
    async executeMessage(message, _client, args) {
      if (!hasPermissions(message.member, PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply('You lack the Moderate Members permission.');
      }
      const user = message.mentions.users.first();
      const minutes = parseInt(args[1], 10);
      const reason = args.slice(2).join(' ') || 'No reason provided';
      if (!user || isNaN(minutes)) return message.reply('Usage: timeout @user <minutes> [reason]');
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      if (!member) return message.reply('User not found in this server.');
      const ms = Math.min(minutes, 10080) * 60 * 1000;
      await member.timeout(ms, reason).catch(() => null);
      await message.reply(`⏲️ Timed out ${user.tag} for ${minutes} minutes.`);
    },
  },
  {
    name: 'purge',
    description: 'Delete a number of recent messages in this channel',
    category: 'moderation',
    slash: {
      name: 'purge',
      description: 'Delete a number of recent messages in this channel',
      options: [
        { name: 'count', description: 'Number of messages (1-100)', type: 4, required: true },
      ],
    },
    async executeSlash(interaction) {
      if (!hasPermissions(interaction.member, PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: 'You lack the Manage Messages permission.', ephemeral: true });
      }
      const count = Math.max(1, Math.min(100, interaction.options.getInteger('count')));
      const deleted = await interaction.channel.bulkDelete(count, true).catch(() => null);
      await interaction.reply({ content: `🧹 Deleted ${deleted?.size ?? 0} messages.`, ephemeral: true });
    },
    async executeMessage(message, _client, args) {
      if (!hasPermissions(message.member, PermissionsBitField.Flags.ManageMessages)) {
        return message.reply('You lack the Manage Messages permission.');
      }
      const count = Math.max(1, Math.min(100, parseInt(args[0], 10) || 0));
      if (!count) return message.reply('Usage: purge <1-100>');
      const deleted = await message.channel.bulkDelete(count, true).catch(() => null);
      await message.reply(`🧹 Deleted ${deleted?.size ?? 0} messages.`);
    },
  },
];
