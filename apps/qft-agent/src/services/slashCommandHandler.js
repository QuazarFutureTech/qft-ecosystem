// apps/qft-agent/src/services/slashCommandHandler.js
// Handles slash command registration and execution for custom commands

const fetch = require('node-fetch');
const { REST, Routes, MessageFlags } = require('discord.js');

class SlashCommandHandler {
  constructor(client) {
    this.client = client;
    this.apiUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
    this.internalSecret = process.env.INTERNAL_BOT_SECRET;
    this.cooldowns = new Map();
  }

  // Register all slash commands for a guild
  async registerSlashCommands(guildId, commands) {
    try {
      if (!commands || commands.length === 0) {
        console.log(`No slash commands provided to register for guild ${guildId}`);
        // If no commands are provided, we should clear existing commands if that's the intent,
        // or just return if the intent is only to register new ones.
        // For now, let's assume if no commands are provided, we don't do anything or clear them.
        // Clearing commands: await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), { body: [] });
        return;
      }

      const discordCommands = commands.map(cmd => ({
        name: cmd.name.toLowerCase().replace(/[^a-z0-9_-]/g, ''), // Ensure Discord-compliant naming
        description: cmd.description || 'Custom command',
        type: cmd.type || 1, // Default to CHAT_INPUT
        options: cmd.options || [] // Assume options are already correctly formatted by API Gateway
      }));

      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
      
      await rest.put(
        Routes.applicationGuildCommands(this.client.user.id, guildId),
        { body: discordCommands }
      );

      console.log(`✅ Registered ${discordCommands.length} slash commands for guild ${guildId}`);
    } catch (error) {
      console.error(`Error registering slash commands for guild ${guildId}:`, error);
      throw error; // Re-throw to be caught by the calling function
    }
  }

  // Parse command code to extract options
  parseCommandOptions(commandCode) {
    const options = [];
    
    // Look for {{arg 0}}, {{arg 1}}, etc.
    const argMatches = commandCode.match(/\{\{arg\s+(\d+)\}\}/g);
    if (argMatches) {
      const maxArg = Math.max(...argMatches.map(m => parseInt(m.match(/\d+/)[0])));
      for (let i = 0; i <= maxArg && i < 25; i++) {
        options.push({
          name: `arg${i}`,
          description: `Argument ${i}`,
          type: 3, // STRING
          required: i === 0
        });
      }
    }
    
    return options;
  }

  // Handle slash command interaction
  async handleInteraction(interaction) {
    if (!interaction.isCommand()) return false;

    const guildId = interaction.guildId;
    const commandName = interaction.commandName;
    const userId = interaction.user.id;

    try {
      // Fetch command from database by name
      const response = await fetch(
        `${this.apiUrl}/api/internal/commands?guildId=${guildId}&trigger=${commandName}`,
        {
          headers: {
            'x-internal-secret': this.internalSecret
          }
        }
      );
      const command = await response.json();

      if (!command || !command.id) {
        return false; // Not a custom command, let built-in handler take over
      }

      // CRITICAL: Defer the interaction IMMEDIATELY to avoid 3-second timeout
      // This extends the response window to 15 minutes
      await interaction.deferReply({ ephemeral: command.response_in_dm || false });

      // Check if command is enabled (after defer so we can use editReply)
      if (!command.enabled) {
        await interaction.editReply({ content: 'This command is currently disabled.' });
        return true;
      }

      // Check cooldown
      const cooldownKey = `${command.id}-${userId}`;
      if (this.cooldowns.has(cooldownKey)) {
        const expirationTime = this.cooldowns.get(cooldownKey);
        if (Date.now() < expirationTime) {
          const timeLeft = Math.ceil((expirationTime - Date.now()) / 1000);
          await interaction.editReply({ 
            content: `Please wait ${timeLeft} seconds before using this command again.`
          });
          return true;
        }
      }

      // Check permissions (roles/channels)
      const canExecute = await this.checkExecutionRules(command, interaction);
      if (!canExecute.allowed) {
        await interaction.editReply({ content: canExecute.reason });
        return true;
      }

      // Build args from interaction options
      const args = [];
      interaction.options.data.forEach(option => {
        args.push(option.value);
      });

      // Execute command
      const context = {
        author: {
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator
        },
        member: {
          id: interaction.member?.id,
          roles: interaction.member?.roles?.cache?.map(r => r.id) || []
        },
        channel: {
          id: interaction.channelId,
          name: interaction.channel?.name
        },
        guild: {
          id: interaction.guildId,
          name: interaction.guild?.name,
          memberCount: interaction.guild?.memberCount
        },
        args: args
      };

      const executeResponse = await fetch(`${this.apiUrl}/api/internal/commands/execute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret
        },
        body: JSON.stringify({
          commandCode: command.command_code,
          context: context
        })
      });

      const executeData = await executeResponse.json();

      if (!executeData.success) {
        await interaction.editReply({ 
          content: `Error executing command: ${executeData.error}`
        });
        return true;
      }

      // Send response
      const replyOptions = {
        content: executeData.output || 'Command executed successfully.'
      };
      
      // Handle embeds
      if (command.response_type === 'embed') {
        try {
          const embedData = JSON.parse(executeData.output);
          replyOptions.embeds = [embedData];
          delete replyOptions.content;
        } catch (e) {
          // If not valid JSON, send as text
        }
      }

      await interaction.editReply(replyOptions);

      // Set cooldown
      if (command.cooldown_seconds > 0) {
        this.cooldowns.set(cooldownKey, Date.now() + (command.cooldown_seconds * 1000));
        setTimeout(() => this.cooldowns.delete(cooldownKey), command.cooldown_seconds * 1000);
      }

      // Update stats
      await fetch(`${this.apiUrl}/api/internal/commands/${command.id}/stats`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret
        }
      });

      return true; // Successfully handled

    } catch (error) {
      console.error('Error handling slash command:', error);
      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ 
            content: 'An error occurred while executing this command.'
          });
        }
      } catch (replyError) {
        console.error('Could not send error reply:', replyError);
      }
      return true; // We handled it (even though it errored)
    }
  }

  async checkExecutionRules(command, interaction) {
    const member = interaction.member;
    const channelId = interaction.channelId;

    // Check required roles
    if (command.require_roles && command.require_roles.length > 0) {
      const hasRole = command.require_roles.some(roleId => 
        member?.roles?.cache?.has(roleId)
      );
      if (!hasRole) {
        return { allowed: false, reason: 'You do not have the required role to use this command.' };
      }
    }

    // Check ignored roles
    if (command.ignore_roles && command.ignore_roles.length > 0) {
      const hasIgnoredRole = command.ignore_roles.some(roleId => 
        member?.roles?.cache?.has(roleId)
      );
      if (hasIgnoredRole) {
        return { allowed: false, reason: 'You cannot use this command with your current roles.' };
      }
    }

    // Check required channels
    if (command.require_channels && command.require_channels.length > 0) {
      if (!command.require_channels.includes(channelId)) {
        return { allowed: false, reason: 'This command cannot be used in this channel.' };
      }
    }

    // Check ignored channels
    if (command.ignore_channels && command.ignore_channels.length > 0) {
      if (command.ignore_channels.includes(channelId)) {
        return { allowed: false, reason: 'This command is disabled in this channel.' };
      }
    }

    return { allowed: true };
  }
}

module.exports = SlashCommandHandler;
