const { PermissionsBitField } = require('discord.js');

const commands = {
  ping: {
    category: 'utility',
    run: async (message) => {
      const sent = await message.reply({ content: 'Pinging...' });
      const latency = sent.createdTimestamp - message.createdTimestamp;
      const api = message.client?.ws?.ping ?? 0;
      await sent.edit(`Pong! 🏓 Message: ${latency}ms | API: ${api}ms`);
    }
  },
  say: {
    category: 'utility',
    run: async (message, args) => {
      if (!args.length) return message.reply('Usage: say <text>');
      await message.channel.send(args.join(' '));
    }
  },
  echo: {
    category: 'utility',
    run: async (message, args) => commands.say.run(message, args)
  },
  coinflip: {
    category: 'fun',
    run: async (message) => {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await message.reply(`🪙 ${result}!`);
    }
  },
  roll: {
    category: 'fun',
    run: async (message, args) => {
      const sides = Math.min(Math.max(parseInt(args[0] || '6', 10) || 6, 2), 1000);
      const roll = Math.floor(Math.random() * sides) + 1;
      await message.reply(`🎲 Rolled a **${roll}** (1-${sides})`);
    }
  },
  purge: {
    category: 'moderation',
    run: async (message, args) => {
      const amount = Math.min(Math.max(parseInt(args[0] || '0', 10), 2), 100);
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply('❌ You need Manage Messages to purge.');
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply('❌ I need Manage Messages to purge.');
      }
      const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
      if (!deleted) return message.reply('❌ Unable to delete messages (they might be too old).');
      const confirm = await message.channel.send(`🧹 Deleted ${deleted.size} messages.`);
      setTimeout(() => confirm.delete().catch(() => {}), 4000);
    }
  },
  kick: {
    category: 'moderation',
    run: async (message, args) => {
      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply('❌ You need Kick Members to use this.');
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply('❌ I need Kick Members permission.');
      }
      const target = args.shift();
      if (!target) return message.reply('Usage: kick <userId|@mention> [reason]');
      const userId = target.replace(/[^0-9]/g, '');
      const reason = args.join(' ') || 'No reason provided';
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) return message.reply('❌ Could not find that member.');
      if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
        return message.reply('❌ I cannot kick a member with equal or higher role.');
      }
      await member.kick(reason).catch(() => null);
      await message.reply(`👢 Kicked <@${userId}>. Reason: ${reason}`);
    }
  },
  ban: {
    category: 'moderation',
    run: async (message, args) => {
      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply('❌ You need Ban Members to use this.');
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply('❌ I need Ban Members permission.');
      }
      const target = args.shift();
      if (!target) return message.reply('Usage: ban <userId|@mention> [reason]');
      const userId = target.replace(/[^0-9]/g, '');
      const reason = args.join(' ') || 'No reason provided';
      await message.guild.members.ban(userId, { reason }).catch(() => null);
      await message.reply(`🔨 Banned <@${userId}>. Reason: ${reason}`);
    }
  },
  timeout: {
    category: 'moderation',
    run: async (message, args) => {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply('❌ You need Moderate Members to use this.');
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply('❌ I need Moderate Members permission.');
      }
      const target = args.shift();
      const duration = parseInt(args.shift() || '0', 10);
      const reason = args.join(' ') || 'No reason provided';
      if (!target || !duration) return message.reply('Usage: timeout <userId|@mention> <minutes> [reason]');
      const userId = target.replace(/[^0-9]/g, '');
      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) return message.reply('❌ Could not find that member.');
      const ms = Math.min(duration * 60 * 1000, 28 * 24 * 60 * 60 * 1000);
      await member.timeout(ms, reason).catch(() => null);
      await message.reply(`⏳ Timed out <@${userId}> for ${duration}m. Reason: ${reason}`);
    }
  },
  userinfo: {
    category: 'utility',
    run: async (message, args) => {
      const target = args[0]?.replace(/[^0-9]/g, '') || message.author.id;
      const user = await message.client.users.fetch(target).catch(() => null);
      if (!user) return message.reply('❌ Could not fetch that user.');
      const lines = [
        `Tag: ${user.tag}`,
        `ID: ${user.id}`,
        `Bot: ${user.bot}`,
        `Created: ${user.createdAt.toISOString()}`
      ];
      await message.reply(lines.join('\n'));
    }
  },
  serverinfo: {
    category: 'utility',
    run: async (message) => {
      const g = message.guild;
      if (!g) return message.reply('Guild info unavailable.');
      const lines = [
        `Name: ${g.name}`,
        `ID: ${g.id}`,
        `Members: ${g.memberCount}`,
        `Created: ${g.createdAt.toISOString()}`
      ];
      await message.reply(lines.join('\n'));
    }
  }
};

async function handle(message, prefix = '!', client) {
  if (!message.content.startsWith(prefix)) return false;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd || !commands[cmd]) return false;
  try {
    await commands[cmd].run(message, args, client);
    return true;
  } catch (err) {
    console.error('[BuiltinPrefixHandler] Error running command', cmd, err);
    try { await message.reply('❌ Error running that command.'); } catch {}
    return true;
  }
}

module.exports = { handle };
