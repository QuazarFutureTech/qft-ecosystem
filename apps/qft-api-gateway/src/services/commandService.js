// qft-api-gateway/src/services/commandService.js
// Custom command engine with YAGPDB-style template system

const { Pool } = require('pg');
const vm = require('vm');
const TemplateEngine = require('./templateEngine');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// ===== PSEUDO-LANG PARSER =====
// Simple GoLang-inspired syntax parser for custom commands
class PseudoLangParser {
  constructor(code) {
    this.code = code;
    this.tokens = [];
    this.ast = null;
  }

  parse() {
    this.tokenize();
    this.buildAST();
    return this.ast;
  }

  tokenize() {
    const tokenRegex = /(\{|\}|:=|==|!=|<=|>=|<|>|\+|-|\*|\/|%|return|if|else|for|func|var|send|log|get|set|[a-zA-Z_]\w*|"[^"]*"|'[^']*'|[0-9]+)/g;
    this.tokens = (this.code.match(tokenRegex) || []).filter(t => t.trim());
  }

  buildAST() {
    let index = 0;
    const statements = [];

    while (index < this.tokens.length) {
      const { stmt, nextIndex } = this.parseStatement(index);
      if (stmt) statements.push(stmt);
      index = nextIndex;
    }

    this.ast = { type: 'program', statements };
  }

  parseStatement(index) {
    const token = this.tokens[index];

    if (!token) return { stmt: null, nextIndex: index };

    // Variable declaration: var name := value
    if (token === 'var') {
      const name = this.tokens[index + 1];
      const value = this.tokens[index + 3];
      return { stmt: { type: 'varDecl', name, value }, nextIndex: index + 4 };
    }

    // Return statement
    if (token === 'return') {
      const value = this.tokens[index + 1];
      return { stmt: { type: 'return', value }, nextIndex: index + 2 };
    }

    // Send to channel/user: send("target", "message")
    if (token === 'send') {
      const target = this.tokens[index + 2];
      const message = this.tokens[index + 4];
      return { stmt: { type: 'send', target, message }, nextIndex: index + 6 };
    }

    // Log action: log("action", details)
    if (token === 'log') {
      const action = this.tokens[index + 2];
      const details = this.tokens[index + 4];
      return { stmt: { type: 'log', action, details }, nextIndex: index + 6 };
    }

    // If statement: if condition { ... }
    if (token === 'if') {
      const condition = this.tokens[index + 1];
      let braceIndex = index + 3;
      let braceCount = 1;
      const startBrace = braceIndex + 1;
      while (braceCount > 0) {
        braceIndex++;
        if (this.tokens[braceIndex] === '{') braceCount++;
        if (this.tokens[braceIndex] === '}') braceCount--;
      }
      const body = this.tokens.slice(startBrace, braceIndex).join(' ');
      return { stmt: { type: 'if', condition, body }, nextIndex: braceIndex + 1 };
    }

    return { stmt: null, nextIndex: index + 1 };
  }
}

// ===== SANDBOX EXECUTOR =====
class CommandSandbox {
  constructor(context = {}) {
    this.context = {
      // Safe built-ins
      Math,
      Date,
      JSON,
      ...context,
      // Safe logging
      log: console.log,
      // Dangerous functions blocked
      require: undefined,
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      exec: undefined,
    };
  }

  async execute(jsCode, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Sandbox execution timeout'));
      }, timeout);

      try {
        const sandbox = vm.createContext(this.context);
        const script = new vm.Script(jsCode);
        const result = script.runInContext(sandbox, { timeout });
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}

// ===== SERVICE FUNCTIONS =====

// Create a new custom command (YAGPDB-style)
const createCommand = async (guildId, commandName, commandCode, authorDiscordId, options = {}) => {
  const {
    description = '',
    triggerType = 'command',
    triggerOnEdit = false,
    caseSensitive = false,
    responseType = 'text',
    responseInDM = false,
    deleteTrigger = false,
    deleteResponse = 0,
    cooldownSeconds = 0,
    requireRoles = [],
    ignoreRoles = [],
    requireChannels = [],
    ignoreChannels = [],
    enabled = true,
    isEphemeral = false
  } = options;

  const query = `
    INSERT INTO custom_commands (
      guild_id, command_name, command_code, author_discord_id, description,
      trigger_type, trigger_on_edit, case_sensitive, response_type, response_in_dm,
      delete_trigger, delete_response, cooldown_seconds,
      require_roles, ignore_roles, require_channels, ignore_channels, enabled, is_ephemeral
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (guild_id, command_name)
    DO UPDATE SET
      command_code = $3,
      description = $5,
      trigger_type = $6,
      trigger_on_edit = $7,
      case_sensitive = $8,
      response_type = $9,
      response_in_dm = $10,
      delete_trigger = $11,
      delete_response = $12,
      cooldown_seconds = $13,
      require_roles = $14,
      ignore_roles = $15,
      require_channels = $16,
      ignore_channels = $17,
      enabled = $18,
      is_ephemeral = $19,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  
  const result = await pool.query(query, [
    guildId, commandName, commandCode, authorDiscordId, description,
    triggerType, triggerOnEdit, caseSensitive, responseType, responseInDM,
    deleteTrigger, deleteResponse, cooldownSeconds,
    JSON.stringify(requireRoles), JSON.stringify(ignoreRoles),
    JSON.stringify(requireChannels), JSON.stringify(ignoreChannels), enabled, isEphemeral
  ]);
  
  return result.rows[0];
};

// Execute a command with template engine
const executeCommand = async (commandCode, context = {}) => {
  try {
    // Normalize context to support both Discord.js and YAGPDB style variables
    const normalizedContext = {
      ...context,
      // Add YAGPDB-style uppercase aliases
      User: context.author || context.user,
      Channel: context.channel,
      Server: context.guild,
      Guild: context.guild,
      Args: context.args || [],
      // Keep lowercase versions too
      user: context.author || context.user,
      author: context.author || context.user,
      channel: context.channel,
      guild: context.guild,
      server: context.guild,
      args: context.args || [],
      member: context.member
    };
    
    const engine = new TemplateEngine(normalizedContext);
    const result = await engine.execute(commandCode);
    return result;
  } catch (error) {
    return { success: false, output: null, error: error.message };
  }
};

// Get command by name (case-insensitive)
const getCommand = async (guildId, commandName) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE guild_id = $1 AND LOWER(command_name) = LOWER($2) AND is_active = true AND enabled = true;
  `;
  const result = await pool.query(query, [guildId, commandName]);
  return result.rows[0] || null;
};

// Get commands by trigger type (for message scanning)
const getCommandsByTrigger = async (guildId, triggerType) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE guild_id = $1 AND trigger_type = $2 AND is_active = true AND enabled = true
    ORDER BY created_at ASC;
  `;
  const result = await pool.query(query, [guildId, triggerType]);
  return result.rows;
};

// Check if command can be executed (cooldown, roles, channels)
const canExecuteCommand = async (command, context) => {
  // Check cooldown
  if (command.cooldown_seconds > 0 && command.last_executed_at) {
    const cooldownMs = command.cooldown_seconds * 1000;
    const timeSinceExecution = Date.now() - new Date(command.last_executed_at).getTime();
    if (timeSinceExecution < cooldownMs) {
      return { canExecute: false, reason: 'cooldown', remainingSeconds: Math.ceil((cooldownMs - timeSinceExecution) / 1000) };
    }
  }

  // Check role restrictions
  const requireRoles = command.require_roles || [];
  const ignoreRoles = command.ignore_roles || [];
  
  if (context.member) {
    const userRoles = context.member.roles?.cache?.map(r => r.id) || [];
    
    if (ignoreRoles.length > 0 && ignoreRoles.some(r => userRoles.includes(r))) {
      return { canExecute: false, reason: 'role_ignored' };
    }
    
    if (requireRoles.length > 0 && !requireRoles.some(r => userRoles.includes(r))) {
      return { canExecute: false, reason: 'role_required' };
    }
  }

  // Check channel restrictions
  const requireChannels = command.require_channels || [];
  const ignoreChannels = command.ignore_channels || [];
  
  if (context.channel) {
    const channelId = context.channel.id;
    
    if (ignoreChannels.includes(channelId)) {
      return { canExecute: false, reason: 'channel_ignored' };
    }
    
    if (requireChannels.length > 0 && !requireChannels.includes(channelId)) {
      return { canExecute: false, reason: 'channel_required' };
    }
  }

  return { canExecute: true };
};

// Update execution stats
const updateExecutionStats = async (commandId) => {
  const query = `
    UPDATE custom_commands
    SET execution_count = execution_count + 1, last_executed_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `;
  await pool.query(query, [commandId]);
};

// List all commands for a guild
const listCommands = async (guildId) => {
  const query = `
    SELECT id, command_name, command_code, description, author_discord_id, trigger_type, 
           trigger_on_edit, case_sensitive, response_type, response_in_dm, 
           delete_trigger, delete_response, cooldown_seconds, 
           require_roles, ignore_roles, require_channels, ignore_channels,
           enabled, execution_count, created_at, last_executed_at
    FROM custom_commands
    WHERE guild_id = $1 AND is_active = true
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [guildId]);
  return result.rows;
};

// Update command
const updateCommand = async (commandId, commandCode, description, options = {}) => {
  const {
    triggerType,
    triggerOnEdit,
    caseSensitive,
    responseType,
    responseInDM,
    deleteTrigger,
    deleteResponse,
    cooldownSeconds,
    requireRoles,
    ignoreRoles,
    requireChannels,
    ignoreChannels,
    enabled,
    isEphemeral
  } = options;

  const query = `
    UPDATE custom_commands
    SET command_code = $1, 
        description = $2,
        trigger_type = COALESCE($3, trigger_type),
        trigger_on_edit = COALESCE($4, trigger_on_edit),
        case_sensitive = COALESCE($5, case_sensitive),
        response_type = COALESCE($6, response_type),
        response_in_dm = COALESCE($7, response_in_dm),
        delete_trigger = COALESCE($8, delete_trigger),
        delete_response = COALESCE($9, delete_response),
        cooldown_seconds = COALESCE($10, cooldown_seconds),
        require_roles = COALESCE($11, require_roles),
        ignore_roles = COALESCE($12, ignore_roles),
        require_channels = COALESCE($13, require_channels),
        ignore_channels = COALESCE($14, ignore_channels),
        enabled = COALESCE($15, enabled),
        is_ephemeral = COALESCE($16, is_ephemeral),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $17
    RETURNING *;
  `;
  const result = await pool.query(query, [
    commandCode, 
    description, 
    triggerType,
    triggerOnEdit,
    caseSensitive,
    responseType,
    responseInDM,
    deleteTrigger,
    deleteResponse,
    cooldownSeconds,
    requireRoles ? JSON.stringify(requireRoles) : null,
    ignoreRoles ? JSON.stringify(ignoreRoles) : null,
    requireChannels ? JSON.stringify(requireChannels) : null,
    ignoreChannels ? JSON.stringify(ignoreChannels) : null,
    enabled,
    isEphemeral,
    commandId
  ]);
  return result.rows[0];
};

// Delete command
const deleteCommand = async (commandId) => {
  const query = `
    UPDATE custom_commands
    SET is_active = false
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [commandId]);
  return result.rows[0];
};

// Import from YAGPDB format
const importYAGPDBCommand = async (guildId, yagpdbJson, authorDiscordId) => {
  // Simplified YAGPDB → pseudo-lang conversion
  const { name, triggers, output, description } = yagpdbJson;
  const commandCode = `
    // Migrated from YAGPDB
    var trigger := "${triggers?.[0] || ''}"
    var output := "${output || ''}"
    send(msg.channel, output)
  `;
  return createCommand(guildId, name, commandCode, authorDiscordId, `[YAGPDB] ${description || ''}`);
};

module.exports = { // Keep for backward compatibility
  CommandSandbox, // Keep for backward compatibility
  createCommand,
  executeCommand,
  getCommand,
  getCommandsByTrigger,
  canExecuteCommand,
  updateExecutionStats,
  listCommands,
  updateCommand,
  deleteCommand,
  importYAGPDBCommand,
};
