const fetch = require('node-fetch');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

class CustomCommandHandler {
  constructor(client) {
    this.client = client;
    this.cooldowns = new Map(); // guildId:commandId -> Map(userId -> timestamp)
    
    // CACHE SYSTEM: Store commands to prevent API spam
    this.commandCache = new Map();
    this.CACHE_TTL = 60 * 1000; // 60 Seconds
  }

  /**
   * Main entry point for processing messages
   */
  async handleMessage(message) {
    const guildId = message.guildId;
    if (!guildId || message.author.bot) return false;

    // Fetch prefix from settings
    const prefix = await settingsService.getGuildPrefix(guildId);

    // Debug: print prefix and message content with char codes, type, and length (only once)
    const prefixCodes = Array.from(prefix).map(c => c.charCodeAt(0));
    const msgCodes = Array.from(message.content).map(c => c.charCodeAt(0));
    console.log(`[CustomCommandHandler] Prefix debug: value='${prefix}', type=${typeof prefix}, length=${prefix.length}, codes=[${prefixCodes.join(', ')}] | Message: '${message.content}' codes=[${msgCodes.join(', ')}]`);
        logger.info('[CustomCommandHandler] Reached prefix command matching block check.');
      logger.info(`[CustomCommandHandler] handleMessage called for message: '${message.content}' from user: ${message.author?.id}`);

    // Check if the custom commands module is enabled for this guild
    const ConfigManager = require('../utils/ConfigManager');
    const isEnabled = await ConfigManager.isCategoryEnabled(guildId, 'commands');
    if (!isEnabled) {
      // Module is disabled, reply with an embed and do not process custom commands
      try {
        await message.reply({
          embeds: [{
            title: 'Custom Commands Disabled',
            description: 'This server has disabled the Custom Commands module. Enable it in the dashboard to use custom commands.',
            color: 0xff5555
          }],
          allowedMentions: { repliedUser: true }
        });
      } catch (e) {
        // Ignore errors (e.g., message deleted)
      }
      return false;
    }

    try {
      // 1. Fetch ALL commands for this guild (Cached)
      const allCommands = await this.getGuildCommandsCached(guildId);
      logger.info(`[CustomCommandHandler] Loaded ${allCommands.length} commands for guild ${guildId}`);
      if (allCommands.length > 0) {
        logger.info('[CustomCommandHandler] Commands:', allCommands.map(c => ({ id: c.id, name: c.command_name, type: c.trigger_type, enabled: c.enabled })));
      }
      if (!allCommands || allCommands.length === 0) return false;

      // 2. Separate commands by type locally
      const prefixCommands = allCommands.filter(c => c.trigger_type === 'command');
      const containsCommands = allCommands.filter(c => c.trigger_type === 'contains');
      const regexCommands = allCommands.filter(c => c.trigger_type === 'regex');

      // 3. Check PREFIX Commands (Most common, check first)
          // Log result of startsWith
          console.log(`[CustomCommandHandler] message.content.startsWith(prefix):`, message.content.startsWith(prefix));
        logger.info(`[CustomCommandHandler] Checking prefix commands. Message content: '${message.content}'`);
      if (message.content.startsWith(prefix)) {
          logger.info('[CustomCommandHandler] Message starts with prefix:', prefix);
        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args[0].toLowerCase();
        logger.info(`[CustomCommandHandler] Incoming commandName: '${commandName}' (from message: '${message.content}')`);
        // Match against trigger_data.trigger for new commands, fallback to command_name for legacy
        const command = prefixCommands.find(cmd => {
          const trigger = cmd.trigger_data?.trigger || cmd.command_name || '';
          const dbTrigger = cmd.case_sensitive ? trigger : trigger.toLowerCase();
          const dbTriggerNoPrefix = dbTrigger.startsWith(prefix) ? dbTrigger.slice(prefix.length) : dbTrigger;
          logger.info(`[CustomCommandHandler] Comparing trigger: '${dbTrigger}' and noPrefix: '${dbTriggerNoPrefix}' to incoming: '${commandName}'`);
          return dbTrigger === commandName || dbTriggerNoPrefix === commandName;
        });
        if (command) {
          logger.info(`[CustomCommandHandler] Matched command: ${command.command_name || command.trigger_data?.trigger} (ID: ${command.id})`);
          await this.executeCommand(command, message, args.slice(1));
          return true; // Stop processing if prefix match found
        } else {
          logger.info('[CustomCommandHandler] No prefix command matched for:', args[0]);
        }
      }

      // 4. Check CONTAINS Commands
      for (const command of containsCommands) {
        const trigger = command.trigger_data?.trigger || command.command_name || '';
        const content = command.case_sensitive ? message.content : message.content.toLowerCase();
        const triggerText = command.case_sensitive ? trigger : trigger.toLowerCase();
        
        if (content.includes(triggerText)) {
          await this.executeCommand(command, message, []);
          return true; // Stop after first match
        }
      }

      // 5. Check REGEX Commands
      for (const command of regexCommands) {
        try {
          const trigger = command.trigger_data?.trigger || command.command_name || '';
          const regex = new RegExp(trigger, command.case_sensitive ? '' : 'i');
          if (regex.test(message.content)) {
            const matches = message.content.match(regex);
            await this.executeCommand(command, message, matches ? Array.from(matches).slice(1) : []);
            return true;
          }
        } catch (err) {
          logger.error(`[CustomCommandHandler] Invalid regex for command ${command.id}:`, err.message);
        }
      }

    } catch (error) {
      logger.error('[CustomCommandHandler] Error handling message:', error);
    }
    
    return false;
  }

  /**
   * Execution Logic
   */
  async executeCommand(command, eventContext, args = [], userVars = {}) {
    try {
      // 1. Rules Check
      const canExecute = await this.checkExecutionRules(command, eventContext);
      if (!canExecute.allowed) {
        if (canExecute.reason === 'cooldown' && canExecute.remainingSeconds) {
           const msg = await eventContext.reply?.(`⏱️ Command on cooldown. Wait ${canExecute.remainingSeconds}s.`).catch(() => {});
           setTimeout(() => msg?.delete?.().catch(() => {}), 5000);
        }
        return;
      }

      // 2. Delete Trigger?
      if (command.delete_trigger && eventContext.delete) {
        await eventContext.delete().catch(() => {});
      }

      // 3. Execute template locally with Agent's TemplateEngine
      const TemplateEngine = require('./templateEngine');
      
      // Build context for template execution with lowercase and uppercase aliases
      const templateContext = {
        User: {
          ID: eventContext.author?.id,
          Username: eventContext.author?.username,
          Discriminator: eventContext.author?.discriminator,
          Avatar: eventContext.author?.avatar,
          Bot: eventContext.author?.bot,
          Mention: eventContext.author ? `<@${eventContext.author.id}>` : ''
        },
        user: {
          ID: eventContext.author?.id,
          Username: eventContext.author?.username,
          Discriminator: eventContext.author?.discriminator,
          Avatar: eventContext.author?.avatar,
          Bot: eventContext.author?.bot,
          Mention: eventContext.author ? `<@${eventContext.author.id}>` : ''
        },
        Member: {
          ID: eventContext.member?.id,
          DisplayName: eventContext.member?.displayName || eventContext.member?.nickname,
          Nickname: eventContext.member?.nickname,
          JoinedAt: eventContext.member?.joinedAt,
        },
        member: {
          ID: eventContext.member?.id,
          DisplayName: eventContext.member?.displayName || eventContext.member?.nickname,
          Nickname: eventContext.member?.nickname,
          JoinedAt: eventContext.member?.joinedAt,
        },
        Channel: {
          ID: eventContext.channel?.id,
          Name: eventContext.channel?.name,
          Topic: eventContext.channel?.topic,
        },
        channel: {
          ID: eventContext.channel?.id,
          Name: eventContext.channel?.name,
          Topic: eventContext.channel?.topic,
        },
        Guild: {
          ID: eventContext.guild?.id,
          Name: eventContext.guild?.name,
          Icon: eventContext.guild?.icon,
          MemberCount: eventContext.guild?.memberCount,
        },
        guild: {
          ID: eventContext.guild?.id,
          Name: eventContext.guild?.name,
          Icon: eventContext.guild?.icon,
          MemberCount: eventContext.guild?.memberCount,
        },
        Server: {
          ID: eventContext.guild?.id,
          Name: eventContext.guild?.name,
          Icon: eventContext.guild?.icon,
          MemberCount: eventContext.guild?.memberCount,
        },
        server: {
          ID: eventContext.guild?.id,
          Name: eventContext.guild?.name,
          Icon: eventContext.guild?.icon,
          MemberCount: eventContext.guild?.memberCount,
        },
        Message: {
          ID: eventContext.id,
          Content: eventContext.content,
          Link: eventContext.url || `https://discord.com/channels/${eventContext.guild?.id || '@me'}/${eventContext.channel?.id}/${eventContext.id}`,
        },
        message: {
          ID: eventContext.id,
          Content: eventContext.content,
          Link: eventContext.url || `https://discord.com/channels/${eventContext.guild?.id || '@me'}/${eventContext.channel?.id}/${eventContext.id}`,
        },
        BotUser: {
          ID: this.client?.user?.id,
          Username: this.client?.user?.username,
        },
        ...userVars // Merge reaction context and other custom vars
      };

      // Execute template locally with the Agent's TemplateEngine
      const engine = new TemplateEngine(this.client, eventContext, templateContext);
      const executeData = await engine.execute(command.command_code, args);
      
      if (!executeData.success) {
        throw new Error(executeData.error || 'Template execution failed');
      }

      const output = executeData.output;

      if (output && output.trim()) {
        const responseMessage = await this.sendResponse(command, eventContext, output);
        // Auto-Delete Response?
        if (command.delete_response > 0 && responseMessage) {
          setTimeout(() => {
            responseMessage.delete?.().catch(() => {});
          }, command.delete_response * 1000);
        }
        // Stats & Cooldown
        this.updateStats(command.id); 
        this.setCooldown(eventContext.guildId || eventContext.guild?.id, command.id, eventContext.author?.id, command.cooldown_seconds);
      }
    } catch (error) {
      logger.error('[CustomCommandHandler] Execution error:', error);
      // Helpful error reply so you know what happened
      if (eventContext.reply) await eventContext.reply(`❌ Execution Error: ${error.message}`).catch(() => {});
    }
  }

  /**
   * Smart Caching Wrapper
   */
  async getGuildCommandsCached(guildId) {
    const now = Date.now();
    const cached = this.commandCache.get(guildId);

    // Return Cache if valid
    if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
      return cached.commands;
    }

    // Otherwise Fetch New
    const commands = await this.fetchAllCommands(guildId);
    
    // Update Cache
    this.commandCache.set(guildId, {
      timestamp: now,
      commands: commands
    });

    return commands;
  }

  /**
   * Fetch ALL commands for a guild from API
   */
  async fetchAllCommands(guildId) {
    try {
      // Include all supported trigger types
      const types = [
        'command', 'contains', 'regex', 'reaction', 'join', 'leave', 'edit', 'scheduled', 'role_add', 'role_remove', 'role_update'
      ];
      const promises = types.map(type =>
        fetch(`${API_URL}/api/internal/commands?guildId=${guildId}&triggerType=${type}`, {
          headers: { 'x-internal-secret': INTERNAL_SECRET },
          timeout: 5000
        }).then(res => {
          if (res.status === 401) {
            console.error('[CustomCommandHandler] 401 Unauthorized when fetching commands. INTERNAL_BOT_SECRET used:', INTERNAL_SECRET);
          }
          return res.ok ? res.json() : { commands: [] };
        })
        .catch(err => ({ commands: [] }))
      );
      const results = await Promise.all(promises);
      return results.flatMap(r => r.commands || []);
    } catch (error) {
      logger.error('[CustomCommandHandler] API Fetch Error:', error);
      return [];
    }
  }
  
  async sendResponse(command, message, output) {
    const allowedMentions = { parse: ['users', 'roles'], repliedUser: true };

    // Helper to send appropriately (DM, channel, or reply)
    const sendPayload = async (payload) => {
      if (command.response_in_dm) {
        return message.author.send(payload);
      }

      // If trigger was deleted or message is gone, avoid replying with a message_reference
      const shouldBypassReply = command.delete_trigger || message?.deleted;

      if (shouldBypassReply) {
        return message.channel.send(payload);
      }

      try {
        return await message.reply(payload);
      } catch (err) {
        // Discord error: unknown message reference (likely deleted original). Fallback to channel.send
        const isUnknownReference = err?.code === 50035 || err?.rawError?.errors?.message_reference;
        if (isUnknownReference) {
          try {
            return await message.channel.send(payload);
          } catch (secondaryErr) {
            throw secondaryErr;
          }
        }
        throw err;
      }
    };

    try {
      // Always try to parse as JSON for embed, fallback to text
      if (command.response_type === 'embed') {
        try {
          const embedData = typeof output === 'string' ? JSON.parse(output) : output;
          const payload = { embeds: [embedData], allowedMentions };
          return await sendPayload(payload);
        } catch {
          // Fallback if JSON parse failed
          const payload = { content: String(output), allowedMentions };
          return await sendPayload(payload);
        }
      } else {
        // Try to parse as JSON, but fallback to text if not valid JSON
        let payload;
        try {
          const embedData = typeof output === 'string' ? JSON.parse(output) : output;
          if (embedData && typeof embedData === 'object' && embedData.title) {
            payload = { embeds: [embedData], allowedMentions };
          } else {
            payload = { content: String(output), allowedMentions };
          }
        } catch {
          payload = { content: String(output), allowedMentions };
        }
        return await sendPayload(payload);
      }
    } catch (error) {
      logger.error('[CustomCommandHandler] Send response error:', error);
      return null;
    }
  }

  async checkExecutionRules(command, message) {
    // Check cooldown
    if (command.cooldown_seconds > 0) {
      const cooldownKey = `${message.guildId}:${command.id}`;
      if (!this.cooldowns.has(cooldownKey)) {
        this.cooldowns.set(cooldownKey, new Map());
      }
      
      const userCooldowns = this.cooldowns.get(cooldownKey);
      const now = Date.now();
      const cooldownEnd = userCooldowns.get(message.author.id) || 0;
      
      if (now < cooldownEnd) {
        return {
          allowed: false,
          reason: 'cooldown',
          remainingSeconds: Math.ceil((cooldownEnd - now) / 1000)
        };
      }
    }

    // Check role requirements
    if (command.require_roles && command.require_roles.length > 0 && message.member) {
      const hasRequiredRole = command.require_roles.some(roleId => 
        message.member.roles.cache.has(roleId)
      );
      if (!hasRequiredRole) {
        return { allowed: false, reason: 'role_required' };
      }
    }

    // Check role ignores
    if (command.ignore_roles && command.ignore_roles.length > 0 && message.member) {
      const hasIgnoredRole = command.ignore_roles.some(roleId =>
        message.member.roles.cache.has(roleId)
      );
      if (hasIgnoredRole) {
        return { allowed: false, reason: 'role_ignored' };
      }
    }

    // Check channel requirements
    if (command.require_channels && command.require_channels.length > 0) {
      if (!command.require_channels.includes(message.channelId)) {
        return { allowed: false, reason: 'channel_required' };
      }
    }

    // Check channel ignores
    if (command.ignore_channels && command.ignore_channels.length > 0) {
      if (command.ignore_channels.includes(message.channelId)) {
        return { allowed: false, reason: 'channel_ignored' };
      }
    }

    return { allowed: true };
  }

  setCooldown(guildId, commandId, userId, cooldownSeconds) {
    if (cooldownSeconds <= 0) return;
    
    const cooldownKey = `${guildId}:${commandId}`;
    if (!this.cooldowns.has(cooldownKey)) {
      this.cooldowns.set(cooldownKey, new Map());
    }
    
    const userCooldowns = this.cooldowns.get(cooldownKey);
    const cooldownEnd = Date.now() + (cooldownSeconds * 1000);
    userCooldowns.set(userId, cooldownEnd);
    
    setTimeout(() => {
      userCooldowns.delete(userId);
    }, cooldownSeconds * 1000);
  }

  async updateStats(commandId) {
    try {
      await fetch(`${API_URL}/api/internal/commands/${commandId}/stats`, {
        method: 'POST',
        headers: { 'x-internal-secret': INTERNAL_SECRET }
      });
    } catch (error) {
      logger.error('[CustomCommandHandler] Update stats error:', error);
    }
  }
}

module.exports = CustomCommandHandler;