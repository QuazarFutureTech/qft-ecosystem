const { EmbedBuilder } = require('discord.js');

module.exports = [
  {
    name: 'ping',
    description: 'Check Lumakio system latency',
    category: 'utility',
    slash: {
      name: 'ping',
      description: 'Check Lumakio system latency',
      options: [],
    },
    async executeSlash(interaction, client) {
      await interaction.reply({
        content: `🏓 Pong! 
        Latency: ${Date.now() - interaction.createdTimestamp}ms
        API: ${Math.round(client.ws.ping)}ms`,
        ephemeral: true,
      });
    },
    async executeMessage(message, client) {
      const reply = `🏓 Pong! 
      Latency: ${Date.now() - message.createdTimestamp}ms 
      API: ${Math.round(client.ws.ping)}ms`;
      await message.reply(reply);
    },
  },
  {
    name: 'status',
    description: 'Report current operational status',
    category: 'utility',
    slash: {
      name: 'status',
      description: 'Report current operational status',
      options: [],
    },
    async executeSlash(interaction) {
      const embed = new EmbedBuilder()
        .setTitle('Lumakio Systems')
        .setDescription('All systems nominal.')
        .setColor(0x00FF99)
        .addFields(
          { name: 'Environment', value: process.env.NODE_ENV || 'Development', inline: true },
          { name: 'Uptime', value: `${Math.round(process.uptime())}s`, inline: true },
        );
      await interaction.reply({ embeds: [embed] });
    },
    async executeMessage(message) {
      await message.reply('Lumakio Systems: All systems nominal.');
    },
  },
  {
    name: 'userinfo',
    description: 'Show information about a user',
    category: 'utility',
    slash: {
      name: 'userinfo',
      description: 'Show information about a user',
      options: [
        { name: 'user', description: 'Target user', type: 6, required: false }, // USER type
      ],
    },
    async executeSlash(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild?.members?.cache?.get(user.id);
      const embed = new EmbedBuilder()
        .setTitle(`User Info: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
          { name: 'Joined', value: member?.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime()/1000)}:R>` : 'Unknown', inline: true },
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async executeMessage(message, _client, args) {
      const target = message.mentions.users.first() || message.author;
      await message.reply(`User Info: ${target.tag} (ID: ${target.id})`);
    },
  },
  {
    name: 'serverinfo',
    description: 'Show information about the server',
    category: 'utility',
    slash: {
      name: 'serverinfo',
      description: 'Show information about the server',
      options: [],
    },
    async executeSlash(interaction) {
      const g = interaction.guild;
      const embed = new EmbedBuilder()
        .setTitle(`Server Info: ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }))
        .addFields(
          { name: 'ID', value: g.id, inline: true },
          { name: 'Members', value: String(g.memberCount), inline: true },
          { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp/1000)}:R>`, inline: true },
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async executeMessage(message) {
      const g = message.guild;
      await message.reply(`Server Info: ${g.name} (Members: ${g.memberCount})`);
    },
  },
  {
    name: 'avatar',
    description: "Get a user's avatar",
    category: 'utility',
    slash: {
      name: 'avatar',
      description: "Get a user's avatar",
      options: [
        { name: 'user', description: 'Target user', type: 6, required: false },
      ],
    },
    async executeSlash(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      await interaction.reply({ content: user.displayAvatarURL({ size: 512 }), ephemeral: true });
    },
    async executeMessage(message) {
      const user = message.mentions.users.first() || message.author;
      await message.reply(user.displayAvatarURL({ size: 512 }));
    },
  },
  {
    name: 'help',
    description: 'Show available commands',
    category: 'utility',
    slash: {
      name: 'help',
      description: 'Show available commands',
      options: [
        { name: 'command', description: 'Specific command to get help for', type: 3, required: false },
      ],
    },
    async executeSlash(interaction, _client, _args, allCommands) {
      const specificCmd = interaction.options.getString('command');
      if (specificCmd) {
        const cmd = allCommands.find(c => c.name === specificCmd.toLowerCase());
        if (!cmd) {
          return interaction.reply({ content: `❌ Command \`${specificCmd}\` not found.`, ephemeral: true });
        }
        const embed = new EmbedBuilder()
          .setTitle(`Help: ${cmd.name}`)
          .setDescription(cmd.description)
          .addFields(
            { name: 'Category', value: cmd.category || 'general', inline: true },
            { name: 'Slash Command', value: `\`/${cmd.slash.name}\``, inline: true },
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      const categories = {};
      allCommands.forEach(cmd => {
        const cat = cmd.category || 'general';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(`\`${cmd.name}\``);
      });
      const embed = new EmbedBuilder()
        .setTitle('📚 Lumakio Commands')
        .setColor(0x00FF99)
        .setDescription('Use `/help <command>` for details on a specific command.')
        .setFooter({ text: `Prefix: ${process.env.COMMAND_PREFIX || '?'}` });
      Object.entries(categories).forEach(([cat, cmds]) => {
        embed.addFields({ name: `${cat.charAt(0).toUpperCase() + cat.slice(1)}`, value: cmds.join(', ') });
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async executeMessage(message, _client, args, allCommands) {
      const specificCmd = args[0];
      if (specificCmd) {
        const cmd = allCommands.find(c => c.name === specificCmd.toLowerCase());
        if (!cmd) {
          return message.reply(`❌ Command \`${specificCmd}\` not found.`);
        }
        return message.reply(`📖 **${cmd.name}** — ${cmd.description}\nCategory: ${cmd.category || 'general'}`);
      }
      const categories = {};
      allCommands.forEach(cmd => {
        const cat = cmd.category || 'general';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.name);
      });
      let helpText = '📚 **Lumakio Commands**\n\n';
      Object.entries(categories).forEach(([cat, cmds]) => {
        helpText += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**: ${cmds.join(', ')}\n`;
      });
      helpText += `\nUse \`?help <command>\` for details.`;
      await message.reply(helpText);
    },
  },
  {
    name: 'setprefix',
    description: 'Set the command prefix for this server',
    category: 'utility',
    slash: {
      name: 'setprefix',
      description: 'Set the command prefix for this server',
      options: [
        { name: 'prefix', description: 'New prefix (1-5 chars)', type: 3, required: true },
      ],
    },
    async executeSlash(interaction) {
      const { PermissionsBitField } = require('discord.js');
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Server permission.', ephemeral: true });
      }
      const prefix = interaction.options.getString('prefix');
      if (!prefix || prefix.length > 5) {
        return interaction.reply({ content: 'Prefix must be 1-5 characters.', ephemeral: true });
      }
      try {
        const response = await fetch(`${process.env.API_URL}/api/v1/guilds/${interaction.guildId}/settings/prefix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_BOT_SECRET },
          body: JSON.stringify({ prefix }),
        });
        if (!response.ok) throw new Error(await response.text());
        await interaction.reply({ content: `✅ Prefix set to \`${prefix}\``, ephemeral: true });
      } catch (err) {
        console.error('[setprefix]', err);
        await interaction.reply({ content: 'Failed to update prefix.', ephemeral: true });
      }
    },
    async executeMessage(message, _client, args) {
      const { PermissionsBitField } = require('discord.js');
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply('You need Manage Server permission.');
      }
      const prefix = args[0];
      if (!prefix || prefix.length > 5) {
        return message.reply('Prefix must be 1-5 characters.');
      }
      try {
        const response = await fetch(`${process.env.API_URL}/api/v1/guilds/${message.guildId}/settings/prefix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_BOT_SECRET },
          body: JSON.stringify({ prefix }),
        });
        if (!response.ok) throw new Error(await response.text());
        await message.reply(`✅ Prefix set to \`${prefix}\``);
      } catch (err) {
        console.error('[setprefix]', err);
        await message.reply('Failed to update prefix.');
      }
    },
  },
  {
    name: 'support',
    description: 'Get an invite to the Lumakio support server',
    category: 'utility',
    slash: {
      name: 'support',
      description: 'Get an invite to the Lumakio support server',
      options: [],
    },
    async executeSlash(interaction) {
      const supportInvite = process.env.SUPPORT_SERVER_INVITE || 'https://discord.gg/lumakio';
      const embed = new EmbedBuilder()
        .setTitle('💬 Need Help?')
        .setDescription(`Join our support server for assistance, updates, and community discussion!`)
        .setColor(0x00FF99)
        .addFields({ name: 'Support Server', value: `[Click here to join](${supportInvite})` })
        .setFooter({ text: 'We\'re here to help!' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async executeMessage(message) {
      const supportInvite = process.env.SUPPORT_SERVER_INVITE || 'https://discord.gg/lumakio';
      await message.reply(`💬 **Need Help?**\nJoin our support server: ${supportInvite}`);
    },
  },
  {
    name: 'invite',
    description: 'Get the bot invite link to add Lumakio to your server',
    category: 'utility',
    slash: {
      name: 'invite',
      description: 'Get the bot invite link to add Lumakio to your server',
      options: [],
    },
    async executeSlash(interaction) {
      const clientId = process.env.CLIENT_ID;
      const permissions = '8'; // Administrator - you can customize this value
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
      
      const embed = new EmbedBuilder()
        .setTitle('✨ Invite Lumakio')
        .setDescription('Add Lumakio to your server and unlock powerful moderation and utility features!')
        .setColor(0x00FF99)
        .addFields({ name: 'Bot Invite Link', value: `[Click here to invite](${inviteUrl})` })
        .setFooter({ text: 'Thank you for choosing Lumakio!' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
    async executeMessage(message) {
      const clientId = process.env.CLIENT_ID;
      const permissions = '8'; // Administrator
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
      await message.reply(`✨ **Invite Lumakio to your server!**\n${inviteUrl}`);
    },
  },
];
