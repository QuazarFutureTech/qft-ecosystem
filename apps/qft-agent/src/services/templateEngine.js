// qft-agent/src/services/templateEngine.js
// YAGPDB-inspired template engine for custom commands

/**
 * Template Engine for Custom Commands
 * Supports YAGPDB-like template syntax with functions
 * 
 * Syntax: {{ functionName arg1 arg2 ... }}
 * Variables: {{ .User.ID }} {{ .Channel.Name }} {{ .Guild.Name }}
 * 
 * Available Functions Categories:
 * - String: lower, upper, title, split, joinStr, printf
 * - Math: add, sub, mult, div, mod, randInt
 * - User: getMember, userArg, editNickname
 * - Role: addRole, removeRole, hasRole, giveRole, takeRole
 * - Channel: getChannel, editChannelName, editChannelTopic
 * - Message: sendMessage, sendDM, editMessage, deleteMessage
 * - Time: currentTime, formatTime, parseTime
 * - Database: dbSet, dbGet, dbDel, dbIncr
 * - Utilities: len, index, slice, range, toString
 */

class TemplateEngine {
  constructor(client, interaction, message) {
    this.client = client;
    this.interaction = interaction;
    this.message = message;
    this.variables = {};
    this.dbNamespace = 'custom_commands';
    
    // Initialize context data
    this.initializeContext();
  }

  initializeContext() {
    // Build context object similar to YAGPDB
    // Discord.js uses lowercase (id, username) but YAGPDB uses uppercase (ID, Username)
    const user = this.interaction?.user || this.message?.author || {};
    const member = this.interaction?.member || this.message?.member || {};
    const channel = this.interaction?.channel || this.message?.channel || {};
    const guild = this.interaction?.guild || this.message?.guild || {};

    this.context = {
      User: {
        ...user,
        ID: user.id,           // Add uppercase alias
        Username: user.username,
        Discriminator: user.discriminator,
        Avatar: user.avatar,
        Bot: user.bot,
        System: user.system,
        MfaEnabled: user.mfaEnabled
      },
      Member: {
        ...member,
        ID: member.id,
        DisplayName: member.displayName || member.nickname,
        Nickname: member.nickname,
        Roles: member.roles || {},
        JoinedAt: member.joinedAt,
        VoiceState: member.voice
      },
      Channel: {
        ...channel,
        ID: channel.id,
        Name: channel.name,
        Topic: channel.topic,
        IsNsfw: channel.nsfw,
        ParentID: channel.parentId,
        Position: channel.position
      },
      Guild: {
        ...guild,
        ID: guild.id,
        Name: guild.name,
        Icon: guild.icon,
        Owner: guild.ownerId,
        MemberCount: guild.memberCount,
        PreferredLocale: guild.preferredLocale,
        Description: guild.description
      },
      Message: this.message || {},
      Args: [],
      Interaction: this.interaction || null
    };
  }

  /**
   * Parse and execute a template string
   * @param {string} template - The template string to parse
   * @param {object} args - Additional arguments passed to the command
   * @returns {Promise<string>} - The rendered template
   */
  async parse(template, args = []) {
    try {
      this.context.Args = args;
      let result = template;

      // Match {{ ... }} expressions
      const regex = /\{\{(.*?)\}\}/gs;
      const matches = [...template.matchAll(regex)];

      for (const match of matches) {
        const expression = match[1].trim();
        const replacement = await this.evaluateExpression(expression);
        // Convert to string only if not null/undefined
        const replacementStr = replacement !== undefined && replacement !== null ? String(replacement) : '';
        result = result.replace(match[0], replacementStr);
      }

      return result;
    } catch (error) {
      console.error('[TemplateEngine] Parse error:', error);
      throw new Error(`Template parsing failed: ${error.message}`);
    }
  }

  /**
   * Evaluate a single template expression
   */
  async evaluateExpression(expr) {
    // Handle variable assignment FIRST (e.g., $user := getUser .User.ID)
    // Must check this before checking if it starts with $
    if (expr.includes(':=')) {
      const [varName, rest] = expr.split(':=').map(s => s.trim());
      if (varName.startsWith('$')) {
        // Evaluate the right side and store in variables
        const result = await this.evaluateExpression(rest);
        const cleanVarName = varName.substring(1);
        this.variables[cleanVarName] = result;
        return ''; // Variable assignments don't produce output
      }
    }

    // Variable access (e.g., .User.ID or $user.username)
    if (expr.startsWith('.') || expr.startsWith('$')) {
      return this.getVariable(expr);
    }

    // Function call (e.g., add 1 2) or (e.g., addField $embed "Name" "Value")
    const parts = expr.split(/\s+/);
    const funcName = parts[0];
    
    // Parse arguments properly (handle quotes, variables, etc.)
    const argsStr = expr.substring(funcName.length).trim();
    const args = this.parseArgs(argsStr);

    if (this.functions[funcName]) {
      return await this.functions[funcName].call(this, ...args);
    }

    // If not a function, treat as literal
    return expr;
  }

  /**
   * Parse function arguments - handles quotes, variables, numbers
   */
  parseArgs(argsStr) {
    if (!argsStr || !argsStr.trim()) return [];
    
    const args = [];
    // Regex to match: quoted strings, variable references ($var), context paths (.User.ID), or other tokens
    const regex = /"([^"]*)"|'([^']*)'|(\$\w+(?:\.\w+)*)|(\.\w+(?:\.\w+)*)|(\S+)/g;
    let match;
    
    while ((match = regex.exec(argsStr)) !== null) {
      let value = match[1] || match[2] || match[3] || match[4] || match[5];
      
      // Check if it's a context path (starts with .)
      if (typeof value === 'string' && value.startsWith('.')) {
        value = this.getVariable(value);
      }
      // Check if it's a variable reference (starts with $)
      else if (typeof value === 'string' && value.startsWith('$')) {
        // If it includes property access, resolve via getVariable
        if (value.includes('.')) {
          value = this.getVariable(value);
        } else {
          const varName = value.substring(1);
          // Look in both variables and context
          value = this.variables[varName] || this.context[varName] || value;
        }
      } 
      // Try numeric conversion
      else {
        const num = Number(value);
        if (!isNaN(num) && value !== '') {
          value = num;
        }
        // Check for boolean
        if (value === 'true') value = true;
        if (value === 'false') value = false;
      }
      
      args.push(value);
    }
    
    return args;
  }

  /**
   * Get variable value from context or stored variables
   */
  getVariable(path) {
    // Handle .Context.Property syntax
    if (path.startsWith('.')) {
      const parts = path.substring(1).split('.');
      let value = this.context;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (value === undefined || value === null) {
          return '';
        }
        value = value[part];
      }

      return value !== undefined && value !== null ? String(value) : '';
    }

    // Handle $variable or $variable.property syntax
    const parts = path.split('.');
    let varName = parts[0];
    let value;

    // Look up in stored variables
    if (varName.startsWith('$')) {
      varName = varName.substring(1);
      value = this.variables[varName];
    } else {
      return '';
    }

    // Traverse property path if present
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        if (value === undefined || value === null) {
          return '';
        }
        
        // Handle both objects and JSON strings
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            return '';
          }
        }
        
        value = value[parts[i]];
      }
    }

    const result = value !== undefined && value !== null ? String(value) : '';
    return result;
  }

  /**
   * Built-in template functions
   */
  functions = {
    // ===== STRING FUNCTIONS =====
    lower: (str) => str.toLowerCase(),
    upper: (str) => str.toUpperCase(),
    title: (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    
    split: (str, sep) => {
      return str.split(sep);
    },
    
    joinStr: (sep, ...args) => {
      return args.join(sep);
    },
    
    printf: (format, ...args) => {
      // Basic printf implementation
      let result = format;
      args.forEach((arg, i) => {
        result = result.replace(`%s`, String(arg));
        result = result.replace(`%d`, Number(arg));
      });
      return result;
    },

    // ===== MATH FUNCTIONS =====
    add: (...nums) => nums.reduce((a, b) => Number(a) + Number(b), 0),
    sub: (...nums) => nums.reduce((a, b) => Number(a) - Number(b)),
    mult: (...nums) => nums.reduce((a, b) => Number(a) * Number(b), 1),
    div: (...nums) => nums.reduce((a, b) => Number(a) / Number(b)),
    mod: (a, b) => Number(a) % Number(b),
    
    randInt: (min, max) => {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      return Math.floor(Math.random() * (Number(max) - Number(min))) + Number(min);
    },

    // ===== USER/MEMBER FUNCTIONS =====
    getMember: async function(userId) {
      try {
        const guild = this.context.Guild;
        return await guild.members.fetch(userId);
      } catch (err) {
        return null;
      }
    },

    userArg: async function(input) {
      // Parse user mention or ID
      const userId = input.replace(/[<@!>]/g, '');
      return await this.functions.getMember.call(this, userId);
    },

    editNickname: async function(newNick) {
      try {
        await this.context.Member.setNickname(newNick);
        return `Nickname changed to ${newNick}`;
      } catch (err) {
        return `Failed to change nickname: ${err.message}`;
      }
    },

    // ===== MENTION FUNCTIONS =====
    userMention: function(userId) {
      // If no userId provided, use the command author
      const id = userId || this.context.User?.id;
      return id ? `<@${id}>` : '@unknown';
    },

    channelMention: function(channelId) {
      const id = channelId || this.context.Channel?.id;
      return id ? `<#${id}>` : '#unknown';
    },

    roleMention: function(roleId) {
      return roleId ? `<@&${roleId}>` : '@role';
    },

    userName: function(userId) {
      if (!userId) return this.context.User?.username || 'Unknown';
      // If userId provided, would need to fetch - for now return the context user
      return this.context.User?.username || 'Unknown';
    },

    userID: function() {
      return this.context.User?.id || '';
    },

    channelName: function(channelId) {
      if (!channelId) return this.context.Channel?.name || 'unknown';
      // If channelId provided, would need to fetch
      return this.context.Channel?.name || 'unknown';
    },

    channelID: function() {
      return this.context.Channel?.id || '';
    },

    // ===== ROLE FUNCTIONS =====
    addRole: async function(roleId) {
      try {
        const role = this.context.Guild.roles.cache.get(roleId) || 
                     this.context.Guild.roles.cache.find(r => r.name === roleId);
        if (!role) return 'Role not found';
        await this.context.Member.roles.add(role);
        return `Added role: ${role.name}`;
      } catch (err) {
        return `Failed to add role: ${err.message}`;
      }
    },

    removeRole: async function(roleId) {
      try {
        const role = this.context.Guild.roles.cache.get(roleId) || 
                     this.context.Guild.roles.cache.find(r => r.name === roleId);
        if (!role) return 'Role not found';
        await this.context.Member.roles.remove(role);
        return `Removed role: ${role.name}`;
      } catch (err) {
        return `Failed to remove role: ${err.message}`;
      }
    },

    hasRole: function(roleId) {
      const role = this.context.Guild.roles.cache.get(roleId) || 
                   this.context.Guild.roles.cache.find(r => r.name === roleId);
      if (!role) return false;
      return this.context.Member.roles.cache.has(role.id);
    },

    // ===== TIME FUNCTIONS =====
    currentTime: () => new Date().toISOString(),
    
    formatTime: (time, format) => {
      try {
        const date = new Date(time);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }
        // Basic format support
        return date.toLocaleString();
      } catch (error) {
        return 'Invalid Date';
      }
    },

    parseTime: (str) => {
      try {
        const date = new Date(str);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }
        return date.toISOString();
      } catch (error) {
        return 'Invalid Date';
      }
    },

    // ===== MESSAGE FUNCTIONS =====
    sendMessage: async function(channelId, content) {
      try {
        const channel = channelId === 'nil' || !channelId 
          ? this.context.Channel 
          : await this.client.channels.fetch(channelId);
        
        if (!channel) return 'Channel not found';
        await channel.send(content);
        return 'Message sent';
      } catch (err) {
        return `Failed to send message: ${err.message}`;
      }
    },

    sendDM: async function(content) {
      try {
        await this.context.User.send(content);
        return 'DM sent';
      } catch (err) {
        return `Failed to send DM: ${err.message}`;
      }
    },

    // ===== DATABASE FUNCTIONS =====
    dbSet: async function(userId, key, value) {
      // This would need actual database implementation
      const fullKey = `${this.dbNamespace}:${userId}:${key}`;
      this.variables[fullKey] = value;
      return 'Value set';
    },

    dbGet: async function(userId, key) {
      const fullKey = `${this.dbNamespace}:${userId}:${key}`;
      return this.variables[fullKey] || '';
    },

    dbDel: async function(userId, key) {
      const fullKey = `${this.dbNamespace}:${userId}:${key}`;
      delete this.variables[fullKey];
      return 'Value deleted';
    },

    dbIncr: async function(userId, key, amount) {
      const fullKey = `${this.dbNamespace}:${userId}:${key}`;
      const current = Number(this.variables[fullKey] || 0);
      this.variables[fullKey] = current + Number(amount);
      return this.variables[fullKey];
    },

    // ===== EMBED FUNCTIONS =====
    createEmbed: function(title, description, color) {
      const embed = {
        title: title || '',
        description: description || '',
        color: color ? parseInt(String(color).replace('#', ''), 16) : 0x5865F2,
        timestamp: new Date().toISOString(),
        fields: []
      };
      return embed;
    },

    setVar: function(name, value) {
      if (name && typeof name === 'string' && name.startsWith('$')) {
        name = name.substring(1);
      }
      this.variables[name] = value;
      this.context[name] = value; // Also store in context
      return value;
    },

    getVar: function(name) {
      if (name && typeof name === 'string' && name.startsWith('$')) {
        name = name.substring(1);
      }
      return this.variables[name] || this.context[name];
    },

    addField: function(embedOrVar, name, value, inline = false) {
      // Resolve variable if it's a variable reference like $embed
      let embed = embedOrVar;
      
      // If embedOrVar is a string starting with $, it's a variable reference
      if (typeof embedOrVar === 'string' && embedOrVar.startsWith('$')) {
        const varName = embedOrVar.substring(1);
        embed = this.variables[varName] || this.context[varName];
        
        if (!embed) {
          console.error(`[TemplateEngine] addField: Variable ${embedOrVar} not found in context`);
          return embedOrVar;
        }
      }
      
      // Add field to the embed
      if (embed && typeof embed === 'object') {
        embed.fields = embed.fields || [];
        embed.fields.push({ 
          name: String(name), 
          value: String(value), 
          inline: Boolean(inline) 
        });
        
        // If it was a variable reference, update both variables and context
        if (typeof embedOrVar === 'string' && embedOrVar.startsWith('$')) {
          const varName = embedOrVar.substring(1);
          this.variables[varName] = embed;
          this.context[varName] = embed;
        }
      }
      
      return embed;
    },

    json: function(obj) {
      try {
        return JSON.stringify(obj, null, 2);
      } catch (err) {
        return String(obj);
      }
    },

    // ===== DATA STRUCTURE FUNCTIONS (YAGPDB-style) =====
    cslice: function(...items) {
      // Create a slice (array)
      return items;
    },

    sdict: function(...pairs) {
      // Create a string dictionary (object). Takes alternating key-value pairs
      const dict = {};
      for (let i = 0; i < pairs.length; i += 2) {
        if (i + 1 < pairs.length) {
          dict[String(pairs[i])] = pairs[i + 1];
        }
      }
      return dict;
    },

    dict: function(...pairs) {
      // Alias for sdict
      return this.sdict(...pairs);
    },

    // ===== CONDITIONAL FUNCTIONS (YAGPDB-style) =====
    if: function(condition, trueVal, falseVal) {
      return condition ? trueVal : (falseVal || '');
    },

    eq: (a, b) => a == b,
    ne: (a, b) => a != b,
    lt: (a, b) => Number(a) < Number(b),
    le: (a, b) => Number(a) <= Number(b),
    gt: (a, b) => Number(a) > Number(b),
    ge: (a, b) => Number(a) >= Number(b),
    and: (...args) => args.every(Boolean),
    or: (...args) => args.some(Boolean),
    not: (val) => !val,
    in: function(sequence, value) {
      if (typeof sequence === 'string') return sequence.includes(value);
      if (Array.isArray(sequence)) return sequence.includes(value);
      return false;
    },

    // ===== STRING FUNCTIONS (YAGPDB-style) =====
    hasPrefix: (str, prefix) => String(str).startsWith(String(prefix)),
    hasSuffix: (str, suffix) => String(str).endsWith(String(suffix)),
    trimSpace: (str) => String(str).trim(),
    split: (str, separator) => String(str).split(String(separator)),
    joinStr: function(separator, ...args) {
      if (args.length === 1 && Array.isArray(args[0])) {
        args = args[0];
      }
      return args.map(String).join(String(separator));
    },

    // ===== ARRAY/SLICE FUNCTIONS (YAGPDB-style) =====
    index: function(list, idx, ...rest) {
      let current = list;
      const indices = [Number(idx), ...rest.map(Number)];
      for (const i of indices) {
        if (typeof current === 'string') {
          current = current.charAt(i);
        } else if (Array.isArray(current)) {
          current = current[i];
        } else if (typeof current === 'object') {
          current = current[i];
        } else {
          return '';
        }
      }
      return current;
    },

    slice: function(list, start, end) {
      start = Number(start);
      if (typeof list === 'string') {
        return list.slice(start, end ? Number(end) : undefined);
      }
      if (Array.isArray(list)) {
        return list.slice(start, end ? Number(end) : undefined);
      }
      return list;
    },

    seq: function(start, stop) {
      const result = [];
      const s = Number(start);
      const e = Number(stop);
      for (let i = s; i < e && result.length < 10000; i++) {
        result.push(i);
      }
      return result;
    },

    shuffle: function(list) {
      if (!Array.isArray(list)) return list;
      const arr = [...list];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    sort: function(list, options) {
      if (!Array.isArray(list)) return list;
      const arr = [...list];
      const reverse = options?.reverse || false;
      
      arr.sort((a, b) => {
        let aVal = a;
        let bVal = b;
        
        if (options?.key && typeof a === 'object' && typeof b === 'object') {
          aVal = a[options.key];
          bVal = b[options.key];
        }
        
        if (aVal < bVal) return reverse ? 1 : -1;
        if (aVal > bVal) return reverse ? -1 : 1;
        return 0;
      });
      
      return arr;
    },

    // ===== TYPE CONVERSION FUNCTIONS (YAGPDB-style) =====
    toInt: (x) => {
      const n = parseInt(x, 10);
      return isNaN(n) ? 0 : n;
    },

    toFloat: (x) => {
      const n = parseFloat(x);
      return isNaN(n) ? 0 : n;
    },

    toString: (x) => String(x),

    // ===== MISCELLANEOUS FUNCTIONS (YAGPDB-style) =====
    humanizeThousands: function(num) {
      const str = String(num);
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    print: function(...args) {
      return args.map(String).join(' ');
    },

    printf: function(format, ...args) {
      let result = format;
      args.forEach((arg, i) => {
        result = result.replace(`%s`, String(arg));
        result = result.replace(`%d`, String(Number(arg)));
      });
      return result;
    },

    kindOf: function(value, indirect) {
      if (value === null) return 'nil';
      if (value === undefined) return 'interface';
      if (Array.isArray(value)) return 'slice';
      if (typeof value === 'object') return 'struct';
      return typeof value;
    },

    // ===== UTILITY FUNCTIONS =====
    len: (val) => {
      if (typeof val === 'string') return val.length;
      if (Array.isArray(val)) return val.length;
      return 0;
    },

    index: (arr, idx) => {
      if (typeof arr === 'string') return arr[Number(idx)];
      if (Array.isArray(arr)) return arr[Number(idx)];
      return '';
    },

    slice: (arr, start, end) => {
      if (typeof arr === 'string') return arr.slice(Number(start), end ? Number(end) : undefined);
      if (Array.isArray(arr)) return arr.slice(Number(start), end ? Number(end) : undefined);
      return arr;
    },

    range: (start, end) => {
      const result = [];
      for (let i = Number(start); i < Number(end); i++) {
        result.push(i);
      }
      return result;
    },

    toString: (val) => String(val),
    toInt: (val) => parseInt(val, 10),
    
    // ===== CONDITIONAL FUNCTIONS =====
    if: function(condition, trueVal, falseVal) {
      return condition ? trueVal : falseVal;
    },

    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    lt: (a, b) => Number(a) < Number(b),
    le: (a, b) => Number(a) <= Number(b),
    gt: (a, b) => Number(a) > Number(b),
    ge: (a, b) => Number(a) >= Number(b),

    // ===== QFT SYSTEM INTEGRATION =====
    // Database Query Functions
    dbQuery: async function(table, where = {}, limit = 100) {
      const qftService = require('./templateEngineQftService');
      return await qftService.dbQuery(table, where, limit);
    },

    dbFetch: async function(table, column, value) {
      const qftService = require('./templateEngineQftService');
      return await qftService.dbFetch(table, column, value);
    },

    dbCount: async function(table, where = {}) {
      const qftService = require('./templateEngineQftService');
      return await qftService.dbCount(table, where);
    },

    dbExists: async function(table, column, value) {
      const qftService = require('./templateEngineQftService');
      return await qftService.dbExists(table, column, value);
    },

    // Registry Functions
    regGet: async function(key, type = null) {
      const qftService = require('./templateEngineQftService');
      return await qftService.regGet(key, type);
    },

    regGetAll: async function(type) {
      const qftService = require('./templateEngineQftService');
      return await qftService.regGetAll(type);
    },

    regSet: async function(key, type, value, description = '') {
      const qftService = require('./templateEngineQftService');
      return await qftService.regSet(key, type, value, description);
    },

    regDelete: async function(key, type) {
      const qftService = require('./templateEngineQftService');
      return await qftService.regDelete(key, type);
    },

    // User & Role Functions
    getUser: async function(userId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.getUser(userId);
    },

    getUserRoles: async function(userId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.getUserRoles(userId);
    },

    getUserHighestRole: async function(userId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.getUserHighestRole(userId);
    },

    hasRole: async function(userId, roleId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.hasRole(userId, roleId);
    },

    checkPermission: async function(userId, permissionKey) {
      const qftService = require('./templateEngineQftService');
      return await qftService.checkPermission(userId, permissionKey);
    },

    getUserPermissions: async function(userId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.getUserPermissions(userId);
    },

    // Bot Filtering Functions
    isBotUser: function(userId) {
      const qftService = require('./templateEngineQftService');
      return qftService.isBotUser(userId);
    },

    filterBots: function(userIds = []) {
      const qftService = require('./templateEngineQftService');
      return qftService.filterBots(userIds);
    },

    validateUser: async function(userId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.validateUser(userId);
    },

    validateRole: async function(roleId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.validateRole(roleId);
    },

    // Module Functions
    moduleGet: async function(moduleId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.moduleGet(moduleId);
    },

    moduleList: async function(pageId) {
      const qftService = require('./templateEngineQftService');
      return await qftService.moduleList(pageId);
    }
  };
}

module.exports = TemplateEngine;
