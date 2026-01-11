// qft-agent/src/services/templateEngine.js

const qftService = require('./templateEngineQftService'); // Move to top if possible

class TemplateEngine {
  constructor(client, eventContext = null, userVars = {}) {
    this.client = client;
    this.eventContext = eventContext;
    this.variables = { ...userVars };
    this.dbNamespace = 'custom_commands';
    this.initializeContext();
    this.functions = {
                                                // ===== LOCALIZATION & FORMATTING HELPERS =====
                                                formatDate: function(date, locale = 'en-US', options = {}) {
                                                  try {
                                                    const d = date instanceof Date ? date : new Date(date);
                                                    return d.toLocaleDateString(locale, options);
                                                  } catch (e) {
                                                    return '';
                                                  }
                                                },
                                                formatTime: function(date, locale = 'en-US', options = {}) {
                                                  try {
                                                    const d = date instanceof Date ? date : new Date(date);
                                                    return d.toLocaleTimeString(locale, options);
                                                  } catch (e) {
                                                    return '';
                                                  }
                                                },
                                                formatDateTime: function(date, locale = 'en-US', options = {}) {
                                                  try {
                                                    const d = date instanceof Date ? date : new Date(date);
                                                    return d.toLocaleString(locale, options);
                                                  } catch (e) {
                                                    return '';
                                                  }
                                                },
                                                formatNumber: function(num, locale = 'en-US', options = {}) {
                                                  try {
                                                    return Number(num).toLocaleString(locale, options);
                                                  } catch (e) {
                                                    return String(num);
                                                  }
                                                },
                                                formatCurrency: function(num, currency = 'USD', locale = 'en-US') {
                                                  try {
                                                    return Number(num).toLocaleString(locale, { style: 'currency', currency });
                                                  } catch (e) {
                                                    return String(num);
                                                  }
                                                },
                                                localize: function(key, translations = {}, locale = 'en-US') {
                                                  // translations: { 'en-US': 'Hello', 'fr-FR': 'Bonjour', ... }
                                                  return translations[locale] || translations['en-US'] || key;
                                                },
                                          // ===== FILE & ATTACHMENT HELPERS =====
                                          sendFile: async function(channelId, fileBuffer, filename, content = '') {
                                            // Send a file to a channel (fileBuffer: Buffer or string URL, filename: string)
                                            try {
                                              const channel = await this.client.channels.fetch(channelId);
                                              if (!channel) return 'Channel not found';
                                              await channel.send({ content, files: [{ attachment: fileBuffer, name: filename }] });
                                              return '';
                                            } catch (e) {
                                              return `Error sending file: ${e.message}`;
                                            }
                                          },
                                          downloadFile: async function(url) {
                                            // Download a file from a URL and return a Buffer
                                            const fetch = require('node-fetch');
                                            try {
                                              const res = await fetch(url);
                                              if (!res.ok) throw new Error('Failed to download file');
                                              return await res.buffer();
                                            } catch (e) {
                                              return null;
                                            }
                                          },
                                          processAttachment: async function(messageId, channelId) {
                                            // Get attachments from a message and return array of {name, url, size, contentType}
                                            try {
                                              const channel = await this.client.channels.fetch(channelId);
                                              if (!channel || !channel.messages) return [];
                                              const msg = await channel.messages.fetch(messageId);
                                              if (!msg || !msg.attachments) return [];
                                              return msg.attachments.map(att => ({
                                                name: att.name,
                                                url: att.url,
                                                size: att.size,
                                                contentType: att.contentType
                                              }));
                                            } catch (e) {
                                              return [];
                                            }
                                          },
                                    // ===== DEBUGGING & INTROSPECTION HELPERS =====
                                    log: function(...args) {
                                      // Log to console (for dev/debug)
                                      console.log('[TemplateEngine]', ...args);
                                      return '';
                                    },
                                    inspect: function(val) {
                                      // Return a stringified, pretty-printed version of any value
                                      try {
                                        return JSON.stringify(val, null, 2);
                                      } catch (e) {
                                        return String(val);
                                      }
                                    },
                                    getContext: function() {
                                      // Return the current context object
                                      return this.context;
                                    },
                                    getVars: function() {
                                      // Return the current template variables
                                      return this.variables;
                                    },
                                    trace: function(msg) {
                                      // Print a stack trace with an optional message
                                      console.trace('[TemplateEngine]', msg || 'Trace');
                                      return '';
                                    },
                              // ===== ADVANCED DB HELPERS =====
                              dbSetAtomic: async function(key, value, expected) {
                                // Only set if current value === expected
                                const current = await qftService.dbGet(key, this.context.Guild?.ID || this.context.User?.ID);
                                if (current === expected) {
                                  await qftService.dbSet(key, value, this.context.Guild?.ID || this.context.User?.ID);
                                  return true;
                                }
                                return false;
                              },
                              dbBatchGet: async function(keys) {
                                // Get multiple keys at once (per-guild)
                                if (!Array.isArray(keys)) return {};
                                const results = {};
                                for (const key of keys) {
                                  results[key] = await qftService.dbGet(key, this.context.Guild?.ID || this.context.User?.ID);
                                }
                                return results;
                              },
                              dbBatchSet: async function(obj) {
                                // Set multiple keys at once (per-guild)
                                if (typeof obj !== 'object' || !obj) return false;
                                for (const key in obj) {
                                  await qftService.dbSet(key, obj[key], this.context.Guild?.ID || this.context.User?.ID);
                                }
                                return true;
                              },
                              dbExists: async function(key) {
                                // Check if a key exists (per-guild)
                                const val = await qftService.dbGet(key, this.context.Guild?.ID || this.context.User?.ID);
                                return val !== undefined && val !== null;
                              },
                              dbGetGlobalBatch: async function(keys) {
                                if (!Array.isArray(keys)) return {};
                                const results = {};
                                for (const key of keys) {
                                  results[key] = await qftService.dbGetGlobal(key);
                                }
                                return results;
                              },
                              dbSetGlobalBatch: async function(obj) {
                                if (typeof obj !== 'object' || !obj) return false;
                                for (const key in obj) {
                                  await qftService.dbSetGlobal(key, obj[key]);
                                }
                                return true;
                              },
                              dbExistsGlobal: async function(key) {
                                const val = await qftService.dbGetGlobal(key);
                                return val !== undefined && val !== null;
                              },
                        // ===== ADVANCED EMBED BUILDERS =====
                        addEmbedField: function(embed, name, value, inline = false) {
                          if (!embed || typeof embed !== 'object') return embed;
                          if (!embed.fields) embed.fields = [];
                          embed.fields.push({ name: String(name), value: String(value), inline: !!inline });
                          return embed;
                        },
                        removeEmbedField: function(embed, name) {
                          if (!embed || !embed.fields) return embed;
                          embed.fields = embed.fields.filter(f => f.name !== name);
                          return embed;
                        },
                        setEmbedImage: function(embed, url) {
                          if (!embed) return embed;
                          embed.image = { url };
                          return embed;
                        },
                        setEmbedThumbnail: function(embed, url) {
                          if (!embed) return embed;
                          embed.thumbnail = { url };
                          return embed;
                        },
                        setEmbedFooter: function(embed, text, iconUrl = null) {
                          if (!embed) return embed;
                          embed.footer = iconUrl ? { text, icon_url: iconUrl } : { text };
                          return embed;
                        },
                        setEmbedAuthor: function(embed, name, iconUrl = null, url = null) {
                          if (!embed) return embed;
                          embed.author = { name };
                          if (iconUrl) embed.author.icon_url = iconUrl;
                          if (url) embed.author.url = url;
                          return embed;
                        },
                        mergeEmbeds: function(...embeds) {
                          // Merge multiple embed objects into one (fields, images, etc.)
                          return Object.assign({}, ...embeds);
                        },
                        contextEmbed: function(title, desc, color) {
                          // Create an embed with context-aware author and footer
                          return {
                            title,
                            description: desc,
                            color: color ? parseInt(String(color).replace('#', ''), 16) : 0x5865F2,
                            author: this.context.User ? { name: this.context.User.Username, icon_url: this.functions.getUserAvatar() } : undefined,
                            footer: this.context.Guild ? { text: this.context.Guild.Name } : undefined,
                            fields: []
                          };
                        },
                  // ===== ADVANCED COMPONENT BUILDERS =====
                  actionRow: function(...components) {
                    // Returns a Discord action row with provided components (buttons, menus, etc.)
                    return { type: 1, components: components.flat() };
                  },
                  button: function(label, customId, style = 1, options = {}) {
                    // style: 1=Primary, 2=Secondary, 3=Success, 4=Danger, 5=Link
                    return Object.assign({
                      type: 2,
                      label,
                      custom_id: customId,
                      style,
                      ...options
                    });
                  },
                  linkButton: function(label, url, options = {}) {
                    return Object.assign({
                      type: 2,
                      label,
                      style: 5,
                      url,
                      ...options
                    });
                  },
                  selectMenu: function(customId, optionsArr, placeholder = '', min = 1, max = 1, optionsObj = {}) {
                    // optionsArr: [{label, value, description, emoji, default}]
                    return Object.assign({
                      type: 3,
                      custom_id: customId,
                      options: optionsArr,
                      placeholder,
                      min_values: min,
                      max_values: max,
                      ...optionsObj
                    });
                  },
                  modal: function(customId, title, components) {
                    // components: array of action rows with text inputs
                    return {
                      custom_id: customId,
                      title,
                      components,
                      type: 5
                    };
                  },
                  textInput: function(customId, label, style = 1, required = false, value = '', placeholder = '', min = 0, max = 4000) {
                    // style: 1=Short, 2=Paragraph
                    return {
                      type: 4,
                      custom_id: customId,
                      label,
                      style,
                      required,
                      value,
                      placeholder,
                      min_length: min,
                      max_length: max
                    };
                  },
            // ===== ADVANCED DISCORD CONTEXT HELPERS =====
            getRoleByName: async function(name) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              return guild.roles.cache.find(r => r.name === name) || null;
            },
            getRoleById: async function(id) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              return guild.roles.cache.get(id) || null;
            },
            getChannelByName: async function(name) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              return guild.channels.cache.find(c => c.name === name) || null;
            },
            getChannelById: async function(id) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              return guild.channels.cache.get(id) || null;
            },
            getMemberByName: async function(name) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              const members = await guild.members.fetch();
              return members.find(m => m.user.username === name || m.displayName === name) || null;
            },
            getMemberById: async function(id) {
              if (!this.context.Guild || !this.client) return null;
              const guild = await this.client.guilds.fetch(this.context.Guild.ID);
              return await guild.members.fetch(id).catch(() => null);
            },
            hasRole: function(roleNameOrId) {
              const roles = this.context.Member?.Roles;
              if (!roles) return false;
              if (typeof roles.has === 'function') {
                return roles.has(roleNameOrId);
              } else if (Array.isArray(roles)) {
                return roles.includes(roleNameOrId);
              }
              return false;
            },
            hasPermission: function(perm) {
              const member = this.context.Member;
              if (!member || !member.permissions) return false;
              if (typeof member.permissions.has === 'function') {
                return member.permissions.has(perm);
              }
              return false;
            },
            isAdmin: function() {
              return this.hasPermission('ADMINISTRATOR');
            },
            isMod: function() {
              // Example: check for a role named 'Moderator' or permission
              return this.hasRole('Moderator') || this.hasPermission('MANAGE_MESSAGES');
            },
            isOwner: function() {
              return this.context.Guild?.Owner === this.context.User?.ID;
            },
            isSelf: function(userId) {
              return this.context.User?.ID === userId;
            },
            isBot: function() {
              return !!this.context.User?.Bot;
            },
            // ...existing code...
      // ===== COMPONENT/EMBED HELPERS =====
      embed: function({ title, description, color, fields, footer, author, image, thumbnail, timestamp }) {
        const embed = {
          title,
          description,
          color: color ? parseInt(String(color).replace('#', ''), 16) : 0x5865F2,
          fields: Array.isArray(fields) ? fields : []
        };
        if (footer) embed.footer = typeof footer === 'string' ? { text: footer } : footer;
        if (author) embed.author = typeof author === 'string' ? { name: author } : author;
        if (image) embed.image = typeof image === 'string' ? { url: image } : image;
        if (thumbnail) embed.thumbnail = typeof thumbnail === 'string' ? { url: thumbnail } : thumbnail;
        if (timestamp) embed.timestamp = timestamp === true ? new Date().toISOString() : timestamp;
        return embed;
      },
      cbutton: (...args) => {
        const [label, style, customId, url] = args;
        return { type: 'button', label, style, customId, url };
      },
      cmenu: (...args) => {
        return { type: 'menu', options: args[0] };
      },
      cmodal: (...args) => {
        const [title, components] = args;
        return { type: 'modal', title, components };
      },
      componentBuilder: (...args) => {
        return { type: 'components', components: args };
      },
      // ===== MESSAGE EDIT/DELETE HELPERS =====
      editMessage: async function(channelId, messageId, newContent, newEmbed) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (!channel || !channel.messages) return 'Channel or messages not found';
          const msg = await channel.messages.fetch(messageId);
          if (!msg) return 'Message not found';
          const options = {};
          if (newContent) options.content = newContent;
          if (newEmbed) options.embeds = Array.isArray(newEmbed) ? newEmbed : [newEmbed];
          await msg.edit(options);
          return '';
        } catch (e) {
          return `Error editing message: ${e.message}`;
        }
      },
      deleteMessage: async function(channelId, messageId, delaySeconds) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (!channel || !channel.messages) return 'Channel or messages not found';
          const msg = await channel.messages.fetch(messageId);
          if (!msg) return 'Message not found';
          if (delaySeconds && !isNaN(delaySeconds) && Number(delaySeconds) > 0) {
            setTimeout(() => {
              msg.delete().catch(() => {});
            }, Number(delaySeconds) * 1000);
            return '';
          } else {
            await msg.delete();
            return '';
          }
        } catch (e) {
          return `Error deleting message: ${e.message}`;
        }
      },
      // ===== ARGUMENT PARSING =====
      parseArgs: function(argsStr) {
        return this.parseArgs(argsStr);
      },
      // ===== ADVANCED/ADMIN/EXECUTION HELPERS =====
      execCC: async function(commandName, ...args) {
        return `execCC not implemented: ${commandName}`;
      },
      sendTemplate: async function(channelId, template, ...args) {
        return `sendTemplate not implemented: ${template}`;
      },
      // ===== QFT DB HELPERS (Per-Guild, Cross-Guild, Global) =====
      dbSet: async function(key, value) {
        return await qftService.dbSet(key, value, this.context.Guild?.ID || this.context.User?.ID);
      },
      dbGet: async function(key) {
        return await qftService.dbGet(key, this.context.Guild?.ID || this.context.User?.ID);
      },
      dbDel: async function(key) {
        return await qftService.dbDel(key, this.context.Guild?.ID || this.context.User?.ID);
      },
      dbIncr: async function(key, by = 1) {
        return await qftService.dbIncr(key, by, this.context.Guild?.ID || this.context.User?.ID);
      },
      dbTopEntries: async function(limit = 10) {
        return await qftService.dbTopEntries(limit, this.context.Guild?.ID || this.context.User?.ID);
      },
      dbGetServer: async function(guildId, key) {
        return await qftService.dbGetServer(guildId, key);
      },
      dbSetServer: async function(guildId, key, value) {
        return await qftService.dbSetServer(guildId, key, value);
      },
      dbDelServer: async function(guildId, key) {
        return await qftService.dbDelServer(guildId, key);
      },
      dbIncrServer: async function(guildId, key, by = 1) {
        return await qftService.dbIncrServer(guildId, key, by);
      },
      dbTopEntriesServer: async function(guildId, limit = 10) {
        return await qftService.dbTopEntriesServer(guildId, limit);
      },
      dbGetGlobal: async function(key) {
        return await qftService.dbGetGlobal(key);
      },
      dbSetGlobal: async function(key, value) {
        return await qftService.dbSetGlobal(key, value);
      },
      dbDelGlobal: async function(key) {
        return await qftService.dbDelGlobal(key);
      },
      dbIncrGlobal: async function(key, by = 1) {
        return await qftService.dbIncrGlobal(key, by);
      },
      dbTopEntriesGlobal: async function(limit = 10) {
        return await qftService.dbTopEntriesGlobal(limit);
      },
      // ===== ADVANCED DISCORD/CONTEXT HELPERS =====
      getAllRoles: async function() {
        if (this.context.Guild && this.client && this.client.guilds) {
          const guild = await this.client.guilds.fetch(this.context.Guild.ID);
          return Array.from(guild.roles.cache.values());
        }
        return [];
      },
      getAllChannels: async function() {
        if (this.context.Guild && this.client && this.client.guilds) {
          const guild = await this.client.guilds.fetch(this.context.Guild.ID);
          return Array.from(guild.channels.cache.values());
        }
        return [];
      },
      getAllMembers: async function() {
        if (this.context.Guild && this.client && this.client.guilds) {
          const guild = await this.client.guilds.fetch(this.context.Guild.ID);
          return Array.from((await guild.members.fetch()).values());
        }
        return [];
      },
      getMessages: async function(channelId, limit = 50) {
        if (this.client && this.client.channels) {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.messages) {
            return Array.from((await channel.messages.fetch({ limit })).values());
          }
        }
        return [];
      },
      getSelfMember: async function() {
        if (this.context.Guild && this.client && this.client.user && this.client.guilds) {
          const guild = await this.client.guilds.fetch(this.context.Guild.ID);
          return await guild.members.fetch(this.client.user.id);
        }
        return {};
      },
      getSelfUser: function() {
        return this.client && this.client.user ? this.client.user : {};
      },
      getInteraction: function() { return this.interaction || null; },
      getMessageContext: function() { return this.message || null; },
      getChannelContext: function() { return this.context.Channel || null; },
      getGuildContext: function() { return this.context.Guild || null; },
      getUserContext: function() { return this.context.User || null; },
      getMemberContext: function() { return this.context.Member || null; },
      getArgs: function() { return this.context.Args || []; },
      getCommandName: function() { return this.context.Message?.commandName || this.interaction?.commandName || ''; },
      getArgsString: function() { return this.context.Args ? this.context.Args.join(' ') : ''; },
      getTimestamp: function() { return Date.now(); },
      getIsoTimestamp: function() { return new Date().toISOString(); },
      getPing: function() { return this.client && this.client.ws ? this.client.ws.ping : null; },
      getUptime: function() { return this.client && this.client.uptime ? this.client.uptime : null; },
      getUptimeSeconds: function() { return this.client && this.client.uptime ? Math.floor(this.client.uptime / 1000) : null; },
      getUptimeString: function() {
        if (!this.client || !this.client.uptime) return '';
        const totalSeconds = Math.floor(this.client.uptime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
      },
      getBotVersion: function() { return process.env.npm_package_version || 'dev'; },
      getEnvironment: function() { return process.env.NODE_ENV || 'development'; },
      getGuildLocale: function() { return this.context.Guild?.PreferredLocale || 'en-US'; },
      getUserLocale: function() { return this.context.User?.locale || 'en-US'; },
      isChannelNSFW: function() { return !!this.context.Channel?.IsNsfw; },
      isGuildOwner: function() { return this.context.Guild?.Owner === this.context.User?.ID; },
      isBot: function() { return !!this.context.User?.Bot; },
      isSystem: function() { return !!this.context.User?.System; },
      isMfaEnabled: function() { return !!this.context.User?.MfaEnabled; },
      getUserAvatar: function() {
        if (!this.context.User?.ID || !this.context.User?.Avatar) return '';
        return `https://cdn.discordapp.com/avatars/${this.context.User.ID}/${this.context.User.Avatar}.png`;
      },
      getGuildIcon: function() {
        if (!this.context.Guild?.ID || !this.context.Guild?.Icon) return '';
        return `https://cdn.discordapp.com/icons/${this.context.Guild.ID}/${this.context.Guild.Icon}.png`;
      },
      getChannelTopic: function() { return this.context.Channel?.Topic || ''; },
      getNickname: function() { return this.context.Member?.Nickname || ''; },
      getDisplayName: function() { return this.context.Member?.DisplayName || ''; },
      getJoinDate: function() { return this.context.Member?.JoinedAt || ''; },
      getMemberRoles: function() { return this.context.Member?.Roles ? Array.from(this.context.Member.Roles) : []; },
      getVoiceState: function() { return this.context.Member?.VoiceState || null; },
      getMessageContent: function() { return this.context.Message?.content || ''; },
      getMessageId: function() { return this.context.Message?.id || ''; },
      getChannelId: function() { return this.context.Channel?.ID || ''; },
      getGuildId: function() { return this.context.Guild?.ID || ''; },
      getUserId: function() { return this.context.User?.ID || ''; },
      getMemberId: function() { return this.context.Member?.ID || ''; },
      sleep: (seconds) => new Promise(res => setTimeout(res, Number(seconds) * 1000)),
      json: function(val) {
        try {
          return JSON.stringify(val);
        } catch (e) {
          return 'Error stringifying value';
        }
      },
      getUser: async function(userId) {
        return await qftService.getUser(userId);
      },
      userMention: function(user) {
        if (!user) return '';
        if (typeof user === 'object') {
          if (user.ID) return `<@${user.ID}>`;
          if (user.discord_id) return `<@${user.discord_id}>`;
        }
        if (typeof user === 'string' && user.match(/^[0-9]+$/)) return `<@${user}>`;
        return '';
      },
      lower: (str) => String(str).toLowerCase(),
      upper: (str) => String(str).toUpperCase(),
      title: (str) => String(str).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
      split: (str, sep) => String(str).split(sep),
      joinStr: (sep, ...args) => {
        if (Array.isArray(sep)) return sep.join(args[0] || ' ');
        return args.join(sep);
      },
      add: (...nums) => nums.reduce((a, b) => Number(a) + Number(b), 0),
      sub: (...nums) => nums.reduce((a, b) => Number(a) - Number(b)),
      mult: (...nums) => nums.reduce((a, b) => Number(a) * Number(b), 1),
      div: (...nums) => nums.reduce((a, b) => Number(a) / Number(b)),
      randInt: (min, max) => {
        if (max === undefined) { max = min; min = 0; }
        return Math.floor(Math.random() * (Number(max) - Number(min))) + Number(min);
      },
      sendMessage: async function(content, channelId) {
        // Use local context or explicit ID
        const target = channelId
          ? await this.client.channels.fetch(channelId).catch(() => null)
          : this.context.ChannelRaw || this.eventContext?.channel || null;
        if (!target) throw new Error('Channel not found');

        const payload = typeof content === 'object' && content !== null
          ? { embeds: [content] }
          : { content: String(content) };

        await target.send(payload);
      },
      sendDM: async function(content) {
        const userObj = this.eventContext?.author || this.context.UserRaw || this.context.User;
        if (!userObj || typeof userObj.send !== 'function') return 'No user context';
        try {
          await userObj.send(content);
          return '';
        } catch(e) { return `Failed DM: ${e.message}`; }
      },
      createEmbed: function(title, desc, color) {
        return {
          title: title,
          description: desc,
          color: color ? parseInt(String(color).replace('#', ''), 16) : 0x5865F2,
          fields: []
        };
      },
      addField: function(embedObj, name, value, inline) {
        if (!embedObj || typeof embedObj !== 'object') return 'Invalid Embed';
        embedObj.fields.push({
          name: String(name),
          value: String(value),
          inline: inline === true || inline === 'true'
        });
        return embedObj;
      },
      // ===== YAGPDB-STYLE HELPERS =====
      cembed: function(...args) {
        // cembed "title" "desc" "#color" OR cembed (sdict "title" "x" "description" "y")
        if (args.length === 1 && typeof args[0] === 'object') {
          const obj = args[0];
          return {
            title: obj.title || '',
            description: obj.description || '',
            color: obj.color ? parseInt(String(obj.color).replace('#', ''), 16) : 0x5865F2,
            fields: obj.fields || [],
            footer: obj.footer || undefined,
            author: obj.author || undefined,
            thumbnail: obj.thumbnail || undefined,
            image: obj.image || undefined,
            timestamp: obj.timestamp || undefined
          };
        }
        // Positional: title, description, color
        const title = args[0] || '';
        const desc = args[1] || '';
        const color = args[2] || '#5865F2';
        return {
          title,
          description: desc,
          color: parseInt(String(color).replace('#', ''), 16),
          fields: []
        };
      },
      cslice: function(...items) {
        return items;
      },
      sdict: function(...pairs) {
        const dict = {};
        for (let i = 0; i < pairs.length; i += 2) {
          if (pairs[i] !== undefined && pairs[i + 1] !== undefined) {
            dict[pairs[i]] = pairs[i + 1];
          }
        }
        return dict;
      },
      toInt64: function(val) {
        // Discord IDs are strings, convert to number (or return as-is for compatibility)
        if (typeof val === 'string') return val;
        return String(val);
      },
      getMessage: async function(channelId, messageId) {
        try {
          const rawChannel = this.eventContext?.channel || this.context.ChannelRaw || null;
          let channel = null;
          if (!channelId || channelId === 'nil') {
            channel = rawChannel;
          } else {
            channel = await this.client.channels.fetch(channelId);
          }
          if (!channel || !channel.messages) return null;
          const msg = await channel.messages.fetch(messageId);
          return msg || null;
        } catch (e) {
          return null;
        }
      },
      deleteMessageReaction: async function(channelId, messageId, userId, emojiName) {
        try {
          const rawChannel = this.eventContext?.channel || this.context.ChannelRaw || null;
          let channel = null;
          if (!channelId || channelId === 'nil') {
            channel = rawChannel;
          } else {
            channel = await this.client.channels.fetch(channelId);
          }
          if (!channel || !channel.messages) return '';
          const msg = await channel.messages.fetch(messageId);
          if (!msg) return '';
          // Remove reaction from specific user
          const reaction = msg.reactions.cache.find(r => r.emoji.name === emojiName || r.emoji.id === emojiName);
          if (reaction) {
            await reaction.users.remove(userId);
          }
          return '';
        } catch (e) {
          return `Error removing reaction: ${e.message}`;
        }
      },
      sendMessageNoEscapeRetID: async function(channelId, content) {
        const rawChannel = this.eventContext?.channel || this.context.ChannelRaw || null;
        let targetChannel = null;
        let msgContent = content;
        if (!channelId || channelId === 'nil') {
          targetChannel = rawChannel;
        } else if (typeof content === 'undefined' && channelId) {
          // Called with single arg - treat as content
          targetChannel = rawChannel;
          msgContent = channelId;
        } else {
          try { targetChannel = await this.client.channels.fetch(channelId); } catch(e){}
        }
        if (!targetChannel || typeof targetChannel.send !== 'function') return '';
        try {
          // Handle embed objects
          let payload;
          if (typeof msgContent === 'object' && (msgContent.title || msgContent.description || msgContent.fields)) {
            payload = { embeds: [msgContent] };
          } else {
            payload = { content: String(msgContent) };
          }
          const sentMsg = await targetChannel.send(payload);
          return sentMsg.id;
        } catch (e) {
          return '';
        }
      },
      addMessageReactions: async function(channelId, messageId, ...emojis) {
        try {
          const rawChannel = this.eventContext?.channel || this.context.ChannelRaw || null;
          let channel = null;
          if (!channelId || channelId === 'nil') {
            channel = rawChannel;
          } else {
            channel = await this.client.channels.fetch(channelId);
          }
          if (!channel || !channel.messages) return '';
          const msg = await channel.messages.fetch(messageId);
          if (!msg) return '';
          for (const emoji of emojis) {
            await msg.react(emoji).catch(() => {});
          }
          return '';
        } catch (e) {
          return '';
        }
      },
      len: (val) => val ? val.length : 0
    };
    // Optionally bind all functions to this instance
    for (const key in this.functions) {
      if (typeof this.functions[key] === 'function') {
        this.functions[key] = this.functions[key].bind(this);
      }
    }
  }

  initializeContext() {
    // If eventContext is provided (Discord message or interaction), build rich context
    if (this.eventContext) {
      const msg = this.eventContext;
      const user = msg.author || msg.user || {};
      const member = msg.member || {};
      const channel = msg.channel || {};
      const guild = msg.guild || {};

      this.context = {
        Event: msg,
        Message: {
          ...msg,
          ID: msg.id,
          Content: msg.content,
          Link: msg.url || `https://discord.com/channels/${guild.id || '@me'}/${channel.id}/${msg.id}`,
          Author: msg.author
        },
        Args: [],
        ChannelRaw: channel,
        UserRaw: user,
        BotUser: this.client?.user ? {
          ID: this.client.user.id,
          Username: this.client.user.username,
          Discriminator: this.client.user.discriminator,
          Avatar: this.client.user.avatar,
          Bot: true
        } : {},
        User: {
          ...user,
          ID: user.id,
          Username: user.username,
          Discriminator: user.discriminator,
          Avatar: user.avatar,
          Bot: user.bot,
          System: user.system,
          Mention: `<@${user.id}>`
        },
        Member: {
          ...member,
          ID: member.id,
          DisplayName: member.displayName || member.nickname,
          Nickname: member.nickname,
          Roles: member.roles || {},
          JoinedAt: member.joinedAt,
          VoiceState: member.voice,
        },
        Channel: {
          ...channel,
          ID: channel.id,
          Name: channel.name,
          Topic: channel.topic,
          IsNsfw: channel.nsfw,
          ParentID: channel.parentId,
          Position: channel.position,
        },
        Guild: {
          ...guild,
          ID: guild.id,
          Name: guild.name,
          Icon: guild.icon,
          Owner: guild.ownerId,
          MemberCount: guild.memberCount,
          PreferredLocale: guild.preferredLocale,
          Description: guild.description,
        },
        ...this.variables,
      };
    } else {
      // Fallback to legacy context if no eventContext
      this.context = { Args: [], ...this.variables };
    }
  }

  async execute(template, args = []) {
    try {
      // Debug: log short preview to help diagnose failures
      try {
        const preview = typeof template === 'string' ? template.slice(0, 200).replace(/\n/g, ' ') : String(template);
        console.debug('[TemplateEngine] Executing template preview:', preview);
      } catch (e) { /* ignore preview errors */ }

      const output = await this.parse(template, args);
      return { success: true, output };
    } catch (error) {
      console.error('[TemplateEngine] Execute error:', error);
      return { success: false, output: null, error: error.message };
    }
  }

  async parse(template, args = []) {
    try {
      this.context.Args = args;
      let result = template;

      // Regex for {{ }} - limitation: does not support nested {{ {{ }} }}
      const regex = /\{\{(.*?)\}\}/gs; 
      const matches = [...template.matchAll(regex)];

      // Process matches
      for (const match of matches) {
        const expression = match[1].trim();
        const replacement = await this.evaluateExpression(expression);
        const replacementStr = replacement !== undefined && replacement !== null ? String(replacement) : '';
        result = result.replace(match[0], replacementStr);
      }

      return result;
    } catch (error) {
      console.error('[TemplateEngine] Parse error:', error);
      return `Error: ${error.message}`; // Return error to user instead of crashing
    }
  }

  async evaluateExpression(expr) {
    // Normalize: strip leading/trailing whitespace and YAGPDB-style parentheses
    expr = expr.trim();
    if (expr.startsWith('(') && expr.endsWith(')')) {
      expr = expr.slice(1, -1).trim();
    }

    // 1. Handle assignments: $var := value
    if (expr.includes(':=')) {
      const [varName, rest] = expr.split(':=').map(s => s.trim());
      if (varName.startsWith('$')) {
        // Always await the result so we store the resolved value, not a Promise
        const result = await this.evaluateExpression(rest);
        // If result is a Promise (from async function), await it
        const resolved = result instanceof Promise ? await result : result;
        const cleanVarName = varName.substring(1);
        this.variables[cleanVarName] = resolved;
        return '';
      }
    }

    // 2. Handle direct variable access
    if (expr.startsWith('.') || (expr.startsWith('$') && !expr.includes(' '))) {
      return this.getVariable(expr);
    }

    // 3. Handle Function Calls
    // Split by space but respect quotes is hard with simple split. 
    // We rely on parseArgs to handle the arguments part.
    const firstSpaceIndex = expr.indexOf(' ');
    
    let funcName, argsStr;
    if (firstSpaceIndex === -1) {
        funcName = expr;
        argsStr = "";
    } else {
        funcName = expr.substring(0, firstSpaceIndex);
        argsStr = expr.substring(firstSpaceIndex + 1);
    }

    const args = this.parseArgs(argsStr);

    if (this.functions[funcName]) {
      try {
        const res = await this.functions[funcName](...args);
        return res;
      } catch (fnErr) {
        console.error(`[TemplateEngine] Error in function '${funcName}' for expression '${expr}':`, fnErr);
        throw new Error(`Function '${funcName}' execution error: ${fnErr.message}`);
      }
    }

    // Function not found: provide detailed error for easier debugging
    console.error(`[TemplateEngine] Function not found: '${funcName}' in expression '${expr}'`);
    throw new Error(`Function not found: ${funcName}`);
  }

  parseArgs(argsStr) {
    if (!argsStr || !argsStr.trim()) return [];
    const args = [];
    let i = 0;
    const len = argsStr.length;
    while (i < len) {
      // Skip whitespace
      while (i < len && /\s/.test(argsStr[i])) i++;
      if (i >= len) break;
      let char = argsStr[i];
      // Handle quoted strings
      if (char === '"' || char === "'") {
        const quote = char;
        let val = '';
        i++;
        while (i < len && argsStr[i] !== quote) {
          if (argsStr[i] === '\\' && i + 1 < len) {
            val += argsStr[++i];
          } else {
            val += argsStr[i];
          }
          i++;
        }
        i++; // Skip closing quote
        args.push(val);
        continue;
      }
      // Handle nested parentheses/brackets (for arrays/objects)
      if (char === '(' || char === '[' || char === '{') {
        const open = char;
        const close = open === '(' ? ')' : open === '[' ? ']' : '}';
        let depth = 1;
        let val = char;
        i++;
        while (i < len && depth > 0) {
          if (argsStr[i] === open) depth++;
          if (argsStr[i] === close) depth--;
          val += argsStr[i];
          i++;
        }
        args.push(val);
        continue;
      }
      // Handle variables and context
      if (argsStr[i] === '$' || argsStr[i] === '.') {
        let start = i;
        i++;
        while (i < len && /[\w.]/.test(argsStr[i])) i++;
        const token = argsStr.slice(start, i);
        args.push(this.getVariable(token));
        continue;
      }
      // Handle plain values (numbers, booleans, words)
      let start = i;
      while (i < len && !/\s/.test(argsStr[i])) i++;
      let raw = argsStr.slice(start, i);
      // Type inference
      if (/^-?\d+(\.\d+)?$/.test(raw)) {
        args.push(Number(raw));
      } else if (raw === 'true') {
        args.push(true);
      } else if (raw === 'false') {
        args.push(false);
      } else {
        args.push(raw);
      }
    }
    return args;
  }

  getVariable(path) {
    if (!path) return '';

    // .User.ID
    if (path.startsWith('.')) {
      const parts = path.substring(1).split('.');
      let value = this.context;
      for (const part of parts) {
        if (value === undefined || value === null) return '';
        value = value[part];
      }
      return value ?? '';
    }

    // $userVar
    if (path.startsWith('$')) { 
      const parts = path.split('.');
      const varName = parts[0].substring(1);
      let value = this.variables[varName]; // Check variable storage
      
      // If variable holds an object and we have property access
      if (parts.length > 1) {
          for (let i = 1; i < parts.length; i++) {
             if (value === undefined || value === null) return '';
             // Handle if value is stored as stringified JSON
             if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                 try { value = JSON.parse(value); } catch(e){}
             }
             value = value[parts[i]];
          }
      }
      return value ?? '';
    }
    return '';
  }
  
  // ...existing code...
}

module.exports = TemplateEngine;
