// apps/qft-agent/src/services/slashCommandHandler.js
// Handles slash command registration and execution for custom commands


const fetch = require('node-fetch');
const { REST, Routes, MessageFlags } = require('discord.js');
const TemplateEngine = require('./templateEngine');

class SlashCommandHandler {
    // Remove all slash commands for a guild
    async clearSlashCommands(guildId) {
      try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        await rest.put(
          Routes.applicationGuildCommands(this.client.user.id, guildId),
          { body: [] }
        );
        console.log(`All slash commands removed for guild ${guildId}`);
      } catch (error) {
        console.error(`Error clearing slash commands for guild ${guildId}:`, error);
      }
    }
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
        return;
      }

      // Only register commands with trigger_type === 'slash' and valid name
        const slashCommands = commands.filter(cmd => (cmd && cmd.trigger_type === 'slash' && typeof cmd.name === 'string'));
      if (slashCommands.length === 0) {
        console.log(`No valid slash commands to register for guild ${guildId}`);
        return;
      }

      const discordCommands = slashCommands.map(cmd => ({
        name: cmd.name.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
        description: cmd.description || 'Custom command',
        type: cmd.type || 1,
        options: cmd.options || []
      }));

      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
      await rest.put(
        Routes.applicationGuildCommands(this.client.user.id, guildId),
        { body: discordCommands }
      );

      console.log(`✅ Registered ${discordCommands.length} slash commands for guild ${guildId}`);
    } catch (error) {
      console.error(`Error registering slash commands for guild ${guildId}:`, error);
      throw error;
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
    const startTime = Date.now();
    let command;
    // Import ConfigManager here to avoid circular deps
    const ConfigManager = require('../utils/ConfigManager');
    // Check if custom commands are enabled for this guild
    const isEnabled = await ConfigManager.isCategoryEnabled(guildId, 'commands');
    if (!isEnabled) {
      try {
        await interaction.reply({
          embeds: [{
            title: 'Custom Commands Disabled',
            description: 'This server has disabled the Custom Commands module. Enable it in the dashboard to use custom commands.',
            color: 0xff5555
          }],
          ephemeral: true
        });
      } catch {}
      return true;
    }
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
      if (response.status === 401) {
        console.error('[SlashCommandHandler] 401 Unauthorized when fetching command. INTERNAL_BOT_SECRET used:', this.internalSecret);
      }
      command = await response.json();
    } catch (err) {
      console.error('[SlashCommandHandler] Error fetching command:', err);
      try { await interaction.reply({ content: 'Error fetching command.', ephemeral: true }); } catch {}
      return true;
    }

    if (!command || !command.id) {
      return false; // Not a custom command, let built-in handler take over
    }

    // Defer the interaction IMMEDIATELY to avoid 3-second timeout
    try {
      const deferOptions = command.response_in_dm ? { flags: 64 } : {};
      await interaction.deferReply(deferOptions);
      const deferTime = Date.now() - startTime;
      if (deferTime > 2500) {
        console.warn(`[SlashCommandHandler] Warning: deferReply took ${deferTime}ms after interaction received!`);
      }
    } catch (err) {
      console.error('[SlashCommandHandler] Error deferring reply:', err);
      return true;
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

    // Execute command locally using the agent TemplateEngine
    const templateContext = {
      Args: args,
      args,
      User: {
        ID: interaction.user.id,
        Username: interaction.user.username,
        Discriminator: interaction.user.discriminator
      },
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator
      },
      Member: {
        ID: interaction.member?.id,
        Roles: interaction.member?.roles?.cache?.map(r => r.id) || []
      },
      member: {
        id: interaction.member?.id,
        roles: interaction.member?.roles?.cache?.map(r => r.id) || []
      },
      Channel: {
        ID: interaction.channelId,
        Name: interaction.channel?.name
      },
      channel: {
        id: interaction.channelId,
        name: interaction.channel?.name
      },
      Guild: {
        ID: interaction.guildId,
        Name: interaction.guild?.name,
        MemberCount: interaction.guild?.memberCount
      },
      guild: {
        id: interaction.guildId,
        name: interaction.guild?.name,
        memberCount: interaction.guild?.memberCount
      },
      Server: {
        ID: interaction.guildId,
        Name: interaction.guild?.name,
        MemberCount: interaction.guild?.memberCount
      },
      server: {
        id: interaction.guildId,
        name: interaction.guild?.name,
        memberCount: interaction.guild?.memberCount
      }
    };

    const engine = new TemplateEngine(this.client, interaction, templateContext);
    const executeData = await engine.execute(command.command_code, args);

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
      setTimeout(() => {
        this.cooldowns.delete(cooldownKey);
      }, command.cooldown_seconds * 1000);
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
      (async () => {
        try {
          if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({ 
              content: 'An error occurred while executing this command.'
            });
          }
        } catch (replyError) {
          console.error('Could not send error reply:', replyError);
        }
      })();
      return true; // We handled it (even though it errored)
    }
  // removed extra closing brace here

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
