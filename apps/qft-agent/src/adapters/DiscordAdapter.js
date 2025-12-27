// qft-agent/src/adapters/DiscordAdapter.js

const { Client, Collection, GatewayIntentBits, Events, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const PlatformManager = require('../PlatformManager'); // Import the singleton PlatformManager

class DiscordAdapter {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                // Add more intents as QFT-Agent grows
            ]
        });
        this.token = token;
        this.client.commands = new Collection();
        
        this._loadCommands();
        this._loadEvents();
        
        // Generic error/reconnect handlers
        this.client.on('shardDisconnect', (event, shardId) => {
            console.warn(`[DiscordAdapter] shardDisconnect (shard ${shardId}):`, event);
            // attempt reconnect
            setTimeout(() => this.login(), 5000);
        });
        this.client.on('error', (err) => {
            console.error('[DiscordAdapter] client error:', err);
        });
        this.client.on('shardError', (err, shardId) => {
            console.error('[DiscordAdapter] shardError', shardId, err);
        });

        this.client.once(Events.ClientReady, c => {
            console.log(`[DiscordAdapter] Logged in as ${c.user.tag}!`);
            // Register this adapter with the PlatformManager
            PlatformManager.registerAdapter('discord', this);
            PlatformManager.setDiscordClient(this.client); // Temporarily expose client via manager

            // Initialize scheduler service and attach to PlatformManager
            try {
                const Scheduler = require('../modules/scheduler');
                const scheduler = new Scheduler(this.client);
                PlatformManager.setService('scheduler', scheduler);
                console.log('[DiscordAdapter] Scheduler service initialized.');
            } catch (err) {
                console.warn('[DiscordAdapter] Scheduler initialization failed:', err.message || err);
            }
        });
    }

    _loadCommands() {
        const commandsPath = path.resolve(__dirname, '../commands');
        const commandFolders = fs.readdirSync(commandsPath);

        for (const folder of commandFolders) {
            const commandsPathNested = path.join(commandsPath, folder);
            const commandFiles = fs.readdirSync(commandsPathNested).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPathNested, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    this.client.commands.set(command.data.name, command);
                    console.log(`[DiscordAdapter] Loaded command: ${command.data.name}`);
                } else {
                    console.warn(`[DiscordAdapter] Command at ${filePath} is missing 'data' or 'execute' property.`);
                }
            }
        }
    }

    _loadEvents() {
        const eventsPath = path.resolve(__dirname, '../events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args, this.client));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args, this.client));
            }
            console.log(`[DiscordAdapter] Loaded event: ${event.name}`);
        }
    }

    async login() {
        if (!this.token) {
            console.error("[DiscordAdapter] BOT_TOKEN is missing. Discord login skipped.");
            return;
        }

        // Exponential backoff login
        const maxAttempts = 6;
        let attempt = 0;
        const attemptLogin = async () => {
            attempt++;
            try {
                await this.client.login(this.token);
                console.log('[DiscordAdapter] Login succeeded.');
                this._startHeartbeat();
            } catch (err) {
                console.error(`[DiscordAdapter] Login attempt ${attempt} failed:`, err.message || err);
                if (attempt < maxAttempts) {
                    const wait = Math.min(60, Math.pow(2, attempt)) * 1000;
                    console.log(`[DiscordAdapter] Retrying login in ${wait / 1000}s...`);
                    setTimeout(attemptLogin, wait);
                } else {
                    console.error('[DiscordAdapter] Max login attempts reached. Giving up.');
                }
            }
        };

        attemptLogin();
    }

    _startHeartbeat() {
        // Clear existing heartbeat if any
        if (this._hb) clearInterval(this._hb);
        this._hb = setInterval(() => {
            try {
                if (!this.client.isReady()) {
                    console.warn('[DiscordAdapter] Heartbeat detected client not ready. Attempting reconnect.');
                    // try re-login
                    this.login();
                }
            } catch (err) {
                console.error('[DiscordAdapter] Heartbeat error:', err);
            }
        }, 30 * 1000);
    }

    // Methods to be used by PlatformManager/AgentCore for Discord-specific actions
    getGuildsCache() {
        return this.client.guilds.cache;
    }

    isClientReady() {
        return this.client.isReady();
    }

    getGuild(guildId) {
        return this.client.guilds.cache.get(guildId);
    }

    async leaveGuild(guildId) {
        const guild = this.getGuild(guildId);
        if (guild) {
            await guild.leave();
            return { success: true, message: `Bot successfully left guild: ${guild.name}` };
        }
        return { success: false, message: 'Bot is not in that guild.' };
    }

    async fetchGuildChannels(guildId) {
        const guild = this.getGuild(guildId);
        if (!guild) {
            return { success: false, message: 'Bot is not in that guild.' };
        }
        const channels = await guild.channels.fetch();
        return { success: true, data: channels.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId, rawPosition: c.rawPosition })) };
    }

    async fetchGuildRoles(guildId) {
        const guild = this.getGuild(guildId);
        if (!guild) {
            return { success: false, message: 'Bot is not in that guild.' };
        }
        const roles = await guild.roles.fetch();
        // Filter out the @everyone role and map to a simpler structure
        const formattedRoles = roles.filter(role => !role.managed && role.name !== '@everyone').map(role => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
        }));
        return { success: true, data: formattedRoles };
    }

    async updateGuildMemberRole(guildId, userId, { roleId, roleName }) {
        const guild = this.getGuild(guildId);
        if (!guild) {
            return { success: false, message: 'Bot is not in that guild.' };
        }

        try {
            const member = await guild.members.fetch(userId);
            if (!member) {
                return { success: false, message: 'Member not found in guild.' };
            }

            let role;
            if (roleId) {
                role = await guild.roles.fetch(roleId);
            } else if (roleName) {
                role = guild.roles.cache.find(r => r.name === roleName);
            }

            if (!role) {
                return { success: false, message: `Role ${roleId || roleName} not found in guild.` };
            }

            // Check if the bot has permission to manage roles and if its role is higher than the target role
            if (!guild.members.me.permissions.has('ManageRoles')) {
                return { success: false, message: 'Bot lacks "Manage Roles" permission.' };
            }
            if (guild.members.me.roles.highest.position <= role.position) {
                return { success: false, message: 'Bot\'s role is not high enough to manage this role.' };
            }
            if (member.roles.highest.position >= guild.members.me.roles.highest.position) {
                return { success: false, message: 'Cannot manage role for a member with equal or higher role than bot.' };
            }
            
            // Remove all existing roles that are not the new role, or if you want to replace all roles.
            // For now, let's assume we are adding a specific role, or setting a primary role.
            // This logic can be refined (e.g., add role, remove role, set exact roles)
            // For simplicity, let's just add the role.
            await member.roles.add(role.id);
            return { success: true, message: `Role "${role.name}" assigned to ${member.user.tag}.` };

        } catch (error) {
            console.error(`Error updating role for user ${userId} in guild ${guildId}:`, error);
            if (error.code === 50013) { // Missing Permissions
                return { success: false, message: 'Bot does not have permissions to manage roles for this member or role.' };
            }
            return { success: false, message: `An internal Discord error occurred: ${error.message}` };
        }
    }

    // Other Discord-specific methods

    async sendEmbedToChannel(guildId, channelId, embedData) {
        const guild = this.getGuild(guildId);
        if (!guild) {
            return { success: false, message: 'Bot is not in that guild.' };
        }
        try {
            const channel = await guild.channels.fetch(channelId);
            if (!channel) return { success: false, message: 'Channel not found.' };
            // Ensure channel type supports messages
            if (![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread, ChannelType.GuildAnnouncement].includes(channel.type)) {
                return { success: false, message: 'Selected channel does not support messages.' };
            }
            // Check send permissions
            const me = guild.members.me;
            if (me && channel.permissionsFor(me).missing([PermissionsBitField.Flags.SendMessages]).length) {
                return { success: false, message: 'Bot lacks permission to send messages in that channel.' };
            }

            const embed = new EmbedBuilder();
            
            // Basic fields
            if (embedData.title) embed.setTitle(embedData.title);
            if (embedData.description) embed.setDescription(embedData.description);
            if (embedData.url) embed.setURL(embedData.url);
            if (embedData.color) {
                try { embed.setColor(embedData.color); } catch {}
            }
            
            // Author
            if (embedData.author && embedData.author.name) {
                embed.setAuthor({
                    name: embedData.author.name,
                    iconURL: embedData.author.icon_url || undefined,
                    url: embedData.author.url || undefined
                });
            }
            
            // Footer
            if (embedData.footer && embedData.footer.text) {
                embed.setFooter({
                    text: embedData.footer.text,
                    iconURL: embedData.footer.icon_url || undefined
                });
            }
            
            // Images
            if (embedData.image && embedData.image.url) {
                embed.setImage(embedData.image.url);
            }
            
            if (embedData.thumbnail && embedData.thumbnail.url) {
                embed.setThumbnail(embedData.thumbnail.url);
            }
            
            // Timestamp
            if (embedData.timestamp) {
                embed.setTimestamp(new Date(embedData.timestamp));
            }
            
            // Fields
            if (embedData.fields && Array.isArray(embedData.fields) && embedData.fields.length > 0) {
                embedData.fields.forEach(field => {
                    if (field.name && field.value) {
                        embed.addFields({
                            name: field.name,
                            value: field.value,
                            inline: field.inline || false
                        });
                    }
                });
            }

            // Build message options
            const messageOptions = { embeds: [embed] };
            
            // Add components if provided
            if (embedData.components && Array.isArray(embedData.components) && embedData.components.length > 0) {
                messageOptions.components = embedData.components;
            }
            
            const sent = await channel.send(messageOptions);
            return { success: true, message: 'Embed posted.', data: { messageId: sent.id, channelId: channel.id } };
        } catch (err) {
            console.error('sendEmbedToChannel error:', err);
            return { success: false, message: err.message || 'Failed to send embed.' };
        }
    }
}

module.exports = DiscordAdapter;
