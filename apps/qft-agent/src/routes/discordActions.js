// qft-agent/src/routes/discordActions.js
// Discord operation proxy endpoints for API Gateway

const express = require('express');
const router = express.Router();

/**
 * POST /api/internal/discord/sendMessage
 * Send a message to a Discord channel
 */
router.post('/discord/sendMessage', async (req, res) => {
  const { guildId, channelId, content, embeds } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    let targetChannel;
    
    if (channelId) {
      targetChannel = await client.channels.fetch(channelId);
    } else if (guildId) {
      const guild = await client.guilds.fetch(guildId);
      targetChannel = guild.systemChannel;
    }

    if (!targetChannel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const payload = {};
    if (content) payload.content = String(content);
    if (embeds) payload.embeds = Array.isArray(embeds) ? embeds : [embeds];

    const sentMessage = await targetChannel.send(payload);
    
    res.json({ 
      success: true, 
      messageId: sentMessage.id,
      channelId: sentMessage.channel.id 
    });
  } catch (error) {
    console.error('[Discord Actions] sendMessage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/sendDM
 * Send a DM to a Discord user
 */
router.post('/discord/sendDM', async (req, res) => {
  const { userId, content, embeds } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const user = await client.users.fetch(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const payload = {};
    if (content) payload.content = String(content);
    if (embeds) payload.embeds = Array.isArray(embeds) ? embeds : [embeds];

    await user.send(payload);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] sendDM error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/editMessage
 * Edit a Discord message
 */
router.post('/discord/editMessage', async (req, res) => {
  const { channelId, messageId, content, embeds } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const payload = {};
    if (content) payload.content = String(content);
    if (embeds) payload.embeds = Array.isArray(embeds) ? embeds : [embeds];

    await message.edit(payload);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] editMessage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/deleteMessage
 * Delete a Discord message
 */
router.post('/discord/deleteMessage', async (req, res) => {
  const { channelId, messageId, delaySeconds } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (delaySeconds && !isNaN(delaySeconds) && Number(delaySeconds) > 0) {
      setTimeout(() => {
        message.delete().catch(() => {});
      }, Number(delaySeconds) * 1000);
    } else {
      await message.delete();
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] deleteMessage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/getMessage
 * Fetch a Discord message
 */
router.post('/discord/getMessage', async (req, res) => {
  const { channelId, messageId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    res.json({ 
      success: true, 
      message: {
        id: message.id,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
          bot: message.author.bot
        },
        createdTimestamp: message.createdTimestamp,
        embeds: message.embeds.map(e => e.toJSON()),
        attachments: message.attachments.map(a => ({
          id: a.id,
          url: a.url,
          name: a.name,
          size: a.size
        }))
      }
    });
  } catch (error) {
    console.error('[Discord Actions] getMessage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/addReaction
 * Add a reaction to a message
 */
router.post('/discord/addReaction', async (req, res) => {
  const { channelId, messageId, emoji } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await message.react(emoji);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] addReaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/removeReaction
 * Remove a reaction from a message
 */
router.post('/discord/removeReaction', async (req, res) => {
  const { channelId, messageId, emoji, userId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.messages) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    const message = await channel.messages.fetch(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.id === emoji);
    if (reaction) {
      if (userId) {
        await reaction.users.remove(userId);
      } else {
        await reaction.remove();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] removeReaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/addRole
 * Add a role to a member
 */
router.post('/discord/addRole', async (req, res) => {
  const { guildId, userId, roleId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, message: 'Guild not found' });
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await member.roles.add(roleId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] addRole error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/removeRole
 * Remove a role from a member
 */
router.post('/discord/removeRole', async (req, res) => {
  const { guildId, userId, roleId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, message: 'Guild not found' });
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await member.roles.remove(roleId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Discord Actions] removeRole error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/fetchChannel
 * Fetch channel information
 */
router.post('/discord/fetchChannel', async (req, res) => {
  const { channelId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }
    
    res.json({ 
      success: true, 
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        topic: channel.topic,
        nsfw: channel.nsfw,
        parentId: channel.parentId,
        position: channel.position
      }
    });
  } catch (error) {
    console.error('[Discord Actions] fetchChannel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/internal/discord/fetchMember
 * Fetch member information
 */
router.post('/discord/fetchMember', async (req, res) => {
  const { guildId, userId } = req.body;
  const client = req.app.locals.client;

  if (!client || !client.isReady()) {
    return res.status(503).json({ success: false, message: 'Discord client not ready' });
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, message: 'Guild not found' });
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    res.json({ 
      success: true, 
      member: {
        id: member.id,
        displayName: member.displayName,
        nickname: member.nickname,
        roles: member.roles.cache.map(r => r.id),
        joinedAt: member.joinedTimestamp
      }
    });
  } catch (error) {
    console.error('[Discord Actions] fetchMember error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
