// qft-agent/src/services/customCommandHandler.js
// YAGPDB-style custom command execution handler

const fetch = require('node-fetch');
const logger = require('../utils/logger');
const TemplateEngine = require('./templateEngine');

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

class CustomCommandHandler {
  constructor(client) {
    this.client = client;
    this.cooldowns = new Map(); // guildId:commandId -> Map(userId -> timestamp)
  }

  async handleMessage(message, prefix = '!') {
    const guildId = message.guildId;
    if (!guildId) return;

    try {
      // Get all command trigger commands for this guild
      const commands = await this.getCommands(guildId, 'command');
      
      // Check if message starts with prefix
      if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/\s+/);
        const commandName = args[0].toLowerCase();
        
        const command = commands.find(cmd => 
          cmd.case_sensitive ? cmd.command_name === commandName : cmd.command_name.toLowerCase() === commandName
        );
        
        if (command) {
          await this.executeCommand(command, message, args.slice(1));
          return true;
        }
      }

      // Check for "contains" trigger type
      const containsCommands = await this.getCommands(guildId, 'contains');
      for (const command of containsCommands) {
        const content = command.case_sensitive ? message.content : message.content.toLowerCase();
        const trigger = command.case_sensitive ? command.command_name : command.command_name.toLowerCase();
        
        if (content.includes(trigger)) {
          await this.executeCommand(command, message, []);
          // Only trigger first matching contains command
          break;
        }
      }

      // Check for regex trigger type
      const regexCommands = await this.getCommands(guildId, 'regex');
      for (const command of regexCommands) {
        try {
          const regex = new RegExp(command.command_name, command.case_sensitive ? '' : 'i');
          if (regex.test(message.content)) {
            const matches = message.content.match(regex);
            await this.executeCommand(command, message, matches ? Array.from(matches).slice(1) : []);
            break;
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

  async executeCommand(command, message, args = []) {
    try {
      // Check if command can be executed (cooldown, roles, channels)
      const canExecute = await this.checkExecutionRules(command, message);
      if (!canExecute.allowed) {
        if (canExecute.reason === 'cooldown' && canExecute.remainingSeconds) {
          await message.reply(`⏱️ Command on cooldown. Please wait ${canExecute.remainingSeconds}s.`).catch(() => {});
        }
        return;
      }

      // Delete trigger message if configured
      if (command.delete_trigger) {
        await message.delete().catch(() => {});
      }

      // Initialize template engine with context
      const templateEngine = new TemplateEngine(this.client, null, message);
      
      // Parse and execute the template
      const output = await templateEngine.parse(command.command_code, args);

      if (output && output.trim()) {
        // Send response
        const responseMessage = await this.sendResponse(command, message, output);
        
        // Auto-delete response if configured
        if (command.delete_response > 0 && responseMessage) {
          setTimeout(() => {
            responseMessage.delete().catch(() => {});
          }, command.delete_response * 1000);
        }

        // Update command execution stats
        await this.updateStats(command.id);
        
        // Set cooldown
        this.setCooldown(message.guildId, command.id, message.author.id, command.cooldown_seconds);
      }

    } catch (error) {
      logger.error('[CustomCommandHandler] Execution error:', error);
      // Optionally send error message to user
      await message.reply(`❌ Command execution failed: ${error.message}`).catch(() => {});
    }
  }

  async sendResponse(command, message, output) {
    try {
      // Allowed mentions configuration to enable user/role pings
      const allowedMentions = {
        parse: ['users', 'roles'],
        repliedUser: true
      };

      if (command.response_type === 'embed') {
        // Parse output as embed JSON
        try {
          const embedData = typeof output === 'string' ? JSON.parse(output) : output;
          if (command.response_in_dm) {
            return await message.author.send({ embeds: [embedData], allowedMentions });
          } else {
            return await message.reply({ embeds: [embedData], allowedMentions });
          }
        } catch {
          // Fallback to text if embed parsing fails
          if (command.response_in_dm) {
            return await message.author.send({ content: String(output), allowedMentions });
          } else {
            return await message.reply({ content: String(output), allowedMentions });
          }
        }
      } else {
        // Plain text response
        if (command.response_in_dm) {
          return await message.author.send({ content: String(output), allowedMentions });
        } else {
          return await message.reply({ content: String(output), allowedMentions });
        }
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
    
    // Clean up after cooldown expires
    setTimeout(() => {
      userCooldowns.delete(userId);
    }, cooldownSeconds * 1000);
  }

  async getCommands(guildId, triggerType) {
    try {
      const response = await fetch(`${API_URL}/api/internal/commands?guildId=${guildId}&triggerType=${triggerType}`, {
        headers: {
          'x-internal-secret': INTERNAL_SECRET
        }
      });
      
      if (!response.ok) {
        logger.error(`[CustomCommandHandler] Failed to fetch commands: ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      return data.commands || [];
    } catch (error) {
      logger.error('[CustomCommandHandler] Get commands error:', error);
      return [];
    }
  }

  async updateStats(commandId) {
    try {
      await fetch(`${API_URL}/api/internal/commands/${commandId}/stats`, {
        method: 'POST',
        headers: {
          'x-internal-secret': INTERNAL_SECRET
        }
      });
    } catch (error) {
      logger.error('[CustomCommandHandler] Update stats error:', error);
    }
  }

  serializeContext(context) {
    // Convert Discord.js objects to plain objects for API transfer
    return {
      author: context.author ? {
        id: context.author.id,
        username: context.author.username,
        discriminator: context.author.discriminator,
        bot: context.author.bot
      } : null,
      channel: context.channel ? {
        id: context.channel.id,
        name: context.channel.name,
        type: context.channel.type
      } : null,
      guild: context.guild ? {
        id: context.guild.id,
        name: context.guild.name,
        memberCount: context.guild.memberCount
      } : null,
      member: context.member ? {
        id: context.member.id,
        roles: context.member.roles.cache.map(r => r.id)
      } : null,
      args: context.args || []
    };
  }
}

module.exports = CustomCommandHandler;
