// apps/qft-agent/src/services/componentListenerHandler.js
// Handles button, modal, and select menu interactions for custom commands

const fetch = require('node-fetch');
const { MessageFlags } = require('discord.js');

class ComponentListenerHandler {
  constructor(client) {
    this.client = client;
    this.apiUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
    this.internalSecret = process.env.INTERNAL_BOT_SECRET;
    this.cooldowns = new Map();
  }

  // Handle button interactions
  async handleButton(interaction) {
    return this.handleComponentInteraction(interaction, 'button');
  }

  // Handle modal submissions
  async handleModal(interaction) {
    return this.handleComponentInteraction(interaction, 'modal');
  }

  // Handle select menu interactions
  async handleSelectMenu(interaction) {
    return this.handleComponentInteraction(interaction, 'select_menu');
  }

  async handleComponentInteraction(interaction, triggerType) {
    const guildId = interaction.guildId;
    const customId = interaction.customId;
    const userId = interaction.user.id;

    try {
      // Fetch command from database
      const response = await fetch(
        `${this.apiUrl}/api/internal/commands?guildId=${guildId}&triggerType=${triggerType}&triggerText=${customId}`,
        {
          headers: {
            'x-internal-secret': this.internalSecret
          }
        }
      );
      const data = await response.json();

      if (!data.success || !data.commands || data.commands.length === 0) {
        return interaction.reply({ content: 'No handler found for this component.', ephemeral: true });
      }

      const command = data.commands[0];

      // Check if command is enabled
      if (!command.enabled) {
        return interaction.reply({ content: 'This handler is currently disabled.', ephemeral: true });
      }

      // Check cooldown
      const cooldownKey = `${command.id}-${userId}`;
      if (this.cooldowns.has(cooldownKey)) {
        const expirationTime = this.cooldowns.get(cooldownKey);
        if (Date.now() < expirationTime) {
          const timeLeft = Math.ceil((expirationTime - Date.now()) / 1000);
          return interaction.reply({ 
            content: `Please wait ${timeLeft} seconds before using this again.`, 
            ephemeral: true 
          });
        }
      }

      // Check permissions (roles/channels)
      const canExecute = await this.checkExecutionRules(command, interaction);
      if (!canExecute.allowed) {
        return interaction.reply({ content: canExecute.reason, ephemeral: true });
      }

      // Build context based on interaction type
      const context = this.buildContext(interaction, triggerType);

      // Execute command
      const executeResponse = await fetch(`${this.apiUrl}/api/internal/commands/execute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret
        },
        body: JSON.stringify({
          commandId: command.id,
          context: context
        })
      });

      const executeData = await executeResponse.json();

      if (!executeData.success) {
        return interaction.reply({ 
          content: `Error executing handler: ${executeData.error}`, 
          flags: MessageFlags.Ephemeral
        });
      }

      // Send response
      const replyOptions = {
        content: executeData.output || 'Handler executed successfully.'
      };
      
      // Set ephemeral flag if response_in_dm is true
      if (command.response_in_dm) {
        replyOptions.flags = MessageFlags.Ephemeral;
      }

      // Handle embeds
      if (command.response_type === 'embed') {
        try {
          const embedData = JSON.parse(executeData.response);
          replyOptions.embeds = [embedData];
          delete replyOptions.content;
        } catch (e) {
          // If not valid JSON, send as text
        }
      }

      await interaction.reply(replyOptions);

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

    } catch (error) {
      console.error(`Error handling ${triggerType} interaction:`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'An error occurred while processing this interaction.', 
          ephemeral: true 
        }).catch(() => {});
      }
    }
  }

  buildContext(interaction, triggerType) {
    const context = {
      User: {
        ID: interaction.user.id,
        Username: interaction.user.username,
        Discriminator: interaction.user.discriminator
      },
      Member: {
        ID: interaction.member?.id,
        Roles: interaction.member?.roles?.cache?.map(r => r.id) || []
      },
      Channel: {
        ID: interaction.channelId,
        Name: interaction.channel?.name
      },
      Server: {
        ID: interaction.guildId,
        Name: interaction.guild?.name,
        MemberCount: interaction.guild?.memberCount
      },
      Interaction: {
        ID: interaction.id,
        Type: triggerType,
        CustomId: interaction.customId
      },
      Args: []
    };

    // Extract data based on interaction type
    if (triggerType === 'button') {
      // Button interactions might have data in customId (e.g., "approve:123")
      const parts = interaction.customId.split(':');
      if (parts.length > 1) {
        context.Args = parts.slice(1);
      }
    } else if (triggerType === 'select_menu') {
      // Select menu has values
      context.Args = interaction.values || [];
      context.SelectMenu = {
        Values: interaction.values
      };
    } else if (triggerType === 'modal') {
      // Modal has fields
      const fields = {};
      interaction.fields.fields.forEach((field, key) => {
        fields[key] = field.value;
        context.Args.push(field.value);
      });
      context.Modal = {
        Fields: fields
      };
    }

    return context;
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
        return { allowed: false, reason: 'You do not have the required role to use this.' };
      }
    }

    // Check ignored roles
    if (command.ignore_roles && command.ignore_roles.length > 0) {
      const hasIgnoredRole = command.ignore_roles.some(roleId => 
        member?.roles?.cache?.has(roleId)
      );
      if (hasIgnoredRole) {
        return { allowed: false, reason: 'You cannot use this with your current roles.' };
      }
    }

    // Check required channels
    if (command.require_channels && command.require_channels.length > 0) {
      if (!command.require_channels.includes(channelId)) {
        return { allowed: false, reason: 'This cannot be used in this channel.' };
      }
    }

    // Check ignored channels
    if (command.ignore_channels && command.ignore_channels.length > 0) {
      if (command.ignore_channels.includes(channelId)) {
        return { allowed: false, reason: 'This is disabled in this channel.' };
      }
    }

    return { allowed: true };
  }
}

module.exports = ComponentListenerHandler;
