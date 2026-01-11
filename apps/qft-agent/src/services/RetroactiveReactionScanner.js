// RetroactiveReactionScanner.js
// Scans recent messages in all text channels, fetches reactions, and triggers reaction-based custom commands if missed.


const CustomCommandHandler = require('./customCommandHandler');
const pool = require('./db');

// Checkpoint helpers
async function getCheckpoint(guildId, channelId) {
  const res = await pool.query(
    'SELECT last_message_id FROM reaction_scan_checkpoints WHERE guild_id = $1 AND channel_id = $2',
    [guildId, channelId]
  );
  return res.rows[0]?.last_message_id || null;
}

async function setCheckpoint(guildId, channelId, lastMessageId) {
  await pool.query(
    `INSERT INTO reaction_scan_checkpoints (guild_id, channel_id, last_message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, channel_id) DO UPDATE SET last_message_id = EXCLUDED.last_message_id`,
    [guildId, channelId, lastMessageId]
  );
}


async function scanRecentReactions(client, guildId, options = {}) {
  const {
    lookbackMinutes = 60, // How far back to scan
    maxMessages = 50,     // Max messages per channel
    dryRun = false        // If true, only log what would be triggered
  } = options;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const handler = new CustomCommandHandler(client);
  const allCommands = await handler.getGuildCommandsCached(guildId);
  const reactionCommands = allCommands.filter(cmd => cmd.trigger_type === 'reaction');
  if (reactionCommands.length === 0) return;

  const now = Date.now();
  const cutoff = now - lookbackMinutes * 60 * 1000;

  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased?.() || !channel.viewable) continue;

    // Get last checkpoint for this channel
    let lastMessageId = await getCheckpoint(guildId, channel.id);
    let fetchOptions = { limit: maxMessages };
    if (lastMessageId) fetchOptions.after = lastMessageId;

    let messages;
    try {
      messages = await channel.messages.fetch(fetchOptions);
    } catch (e) {
      continue;
    }
    let newestMessageId = null;
    for (const msg of messages.values()) {
      if (msg.createdTimestamp < cutoff) continue;
      if (!newestMessageId || BigInt(msg.id) > BigInt(newestMessageId)) newestMessageId = msg.id;
      for (const [_, reaction] of msg.reactions.cache) {
        let users;
        try {
          users = await reaction.users.fetch();
        } catch (e) {
          continue;
        }
        for (const user of users.values()) {
          if (user.bot) continue;
          for (const command of reactionCommands) {
            let shouldRun = true;
            if (command.trigger_data && command.trigger_data.emoji) {
              const emoji = reaction.emoji.name || reaction.emoji.id;
              if (emoji !== command.trigger_data.emoji) shouldRun = false;
            }
            if (shouldRun) {
              if (dryRun) {
                console.log(`[RetroactiveReactionScanner][DRYRUN] Would trigger command ${command.command_name} for user ${user.id} on message ${msg.id}`);
              } else {
                await handler.executeCommand(command, msg, [], {});
                console.log(`[RetroactiveReactionScanner] Triggered command ${command.command_name} for user ${user.id} on message ${msg.id}`);
              }
            }
          }
        }
      }
    }
    // Update checkpoint if we found a newer message
    if (newestMessageId) {
      await setCheckpoint(guildId, channel.id, newestMessageId);
    }
  }
}

module.exports = { scanRecentReactions };
