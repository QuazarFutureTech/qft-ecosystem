// qft-api-gateway/src/services/commandService.js
// Custom command engine with YAGPDB-style template system

const db = require('../db');

// Helper to parse JSON arrays from DB
const parseCommandArrays = (command) => {
  if (!command) return command;
  const parsedCommand = { ...command };
  try {
    if (parsedCommand.require_roles && typeof parsedCommand.require_roles === 'string') {
      parsedCommand.require_roles = JSON.parse(parsedCommand.require_roles);
    }
    if (parsedCommand.ignore_roles && typeof parsedCommand.ignore_roles === 'string') {
      parsedCommand.ignore_roles = JSON.parse(parsedCommand.ignore_roles);
    }
    if (parsedCommand.require_channels && typeof parsedCommand.require_channels === 'string') {
      parsedCommand.require_channels = JSON.parse(parsedCommand.require_channels);
    }
    if (parsedCommand.ignore_channels && typeof parsedCommand.ignore_channels === 'string') {
      parsedCommand.ignore_channels = JSON.parse(parsedCommand.ignore_channels);
    }
    if (parsedCommand.trigger_data && typeof parsedCommand.trigger_data === 'string') {
      parsedCommand.trigger_data = JSON.parse(parsedCommand.trigger_data);
    }
  } catch (e) {
    console.error('Error parsing command arrays for command ID:', command.id, e);
    // Fallback to empty arrays in case of parsing error
    parsedCommand.require_roles = [];
    parsedCommand.ignore_roles = [];
    parsedCommand.require_channels = [];
    parsedCommand.ignore_channels = [];
    parsedCommand.trigger_data = {};
  }
  return parsedCommand;
};

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

    // Add more statement parsing as needed
    return { stmt: null, nextIndex: index + 1 };
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
    triggerData = {},
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
  // Normalize commandName: strip prefix and force lowercase
  let normalizedName = (commandName || '').trim();
  normalizedName = normalizedName.replace(/^[!\/.]+/, '');
  normalizedName = normalizedName.toLowerCase();
  // Allow empty names to be stored as NULL so CCID is primary identifier
  if (normalizedName === '') normalizedName = null;
  // Ensure triggerType is always set and valid
  const safeTriggerType = (triggerType === 'slash' || triggerType === 'command') ? triggerType : 'command';

  // Determine next command_index for this guild (start at 0)
  const idxRes = await db.query('SELECT MAX(command_index) AS max_idx FROM custom_commands WHERE guild_id = $1', [guildId]);
  const nextIndex = (idxRes.rows[0] && typeof idxRes.rows[0].max_idx === 'number') ? idxRes.rows[0].max_idx + 1 : 0;

  const query = `
    INSERT INTO custom_commands (
      guild_id, command_index, command_name, command_code, author_discord_id, description,
      trigger_type, trigger_on_edit, case_sensitive, response_type, response_in_dm,
      delete_trigger, delete_response, cooldown_seconds,
      require_roles, ignore_roles, require_channels, ignore_channels, enabled, is_ephemeral, trigger_data
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *;
  `;

  const result = await db.query(query, [
    guildId, nextIndex, normalizedName, commandCode, authorDiscordId, description,
    triggerType, triggerOnEdit, caseSensitive, responseType, responseInDM,
    deleteTrigger, deleteResponse, cooldownSeconds,
    JSON.stringify(requireRoles), JSON.stringify(ignoreRoles),
    JSON.stringify(requireChannels), JSON.stringify(ignoreChannels), enabled, isEphemeral,
    JSON.stringify(triggerData)
  ]);

  return parseCommandArrays(result.rows[0]);
};

// Get command by name (case-insensitive)
const getCommand = async (guildId, commandName) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE guild_id = $1 AND LOWER(command_name) = LOWER($2) AND is_active = true AND enabled = true;
  `;
  const result = await db.query(query, [guildId, commandName]);
  return parseCommandArrays(result.rows[0] || null);
};

// Get commands by trigger type (for message scanning)
const getCommandsByTrigger = async (guildId, triggerType, triggerText = null) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE guild_id = $1 AND trigger_type = $2 AND is_active = true AND enabled = true
    ORDER BY created_at ASC;
  `;
  const result = await db.query(query, [guildId, triggerType]);
  const commands = result.rows.map(parseCommandArrays);

  if (!triggerText) return commands;

  const needle = String(triggerText).toLowerCase();
  return commands.filter(cmd => {
    const nameMatch = (cmd.command_name || '').toLowerCase() === needle;
    const triggerData = cmd.trigger_data || {};
    const customIdMatch = (triggerData.custom_id || triggerData.customId || '').toLowerCase() === needle;
    const textMatch = (triggerData.trigger_text || triggerData.triggerText || '').toLowerCase() === needle;
    return nameMatch || customIdMatch || textMatch;
  });
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
  await db.query(query, [commandId]);
};

// List all commands for a guild
const listCommands = async (guildId) => {
  const query = `
    SELECT id, command_index, command_name, command_code, description, author_discord_id, trigger_type, 
           trigger_on_edit, case_sensitive, response_type, response_in_dm, 
           delete_trigger, delete_response, cooldown_seconds, 
           require_roles, ignore_roles, require_channels, ignore_channels,
           enabled, execution_count, created_at, last_executed_at, trigger_data
    FROM custom_commands
    WHERE guild_id = $1 AND is_active = true
    ORDER BY created_at DESC;
  `;
  const result = await db.query(query, [guildId]);
  if (!result.rows || !Array.isArray(result.rows)) return [];
  return result.rows.length ? result.rows.map(parseCommandArrays) : [];
};

// Update command
const updateCommand = async (commandId, commandCode, description, options = {}) => {
  const {
    commandName,
    triggerType,
    triggerOnEdit,
    caseSensitive,
    responseType,
    responseInDM,
    triggerData = {},
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
  // Normalize commandName if provided
  let normalizedName = commandName;
  if (typeof normalizedName === 'string') {
    normalizedName = normalizedName.trim().replace(/^[!\/.]+/, '').toLowerCase();
  }
  // Allow all trigger types as provided
  const safeTriggerType = triggerType || 'command';

  const query = `
    UPDATE custom_commands
    SET command_code = $1, 
        description = $2,
        trigger_type = COALESCE($3, trigger_type),
        trigger_on_edit = COALESCE($4, trigger_on_edit),
        case_sensitive = COALESCE($5, case_sensitive),
        response_type = COALESCE($6, response_type),
        response_in_dm = COALESCE($7, response_in_dm),
        trigger_data = COALESCE($8, trigger_data),
        delete_trigger = COALESCE($9, delete_trigger),
        delete_response = COALESCE($10, delete_response),
        cooldown_seconds = COALESCE($11, cooldown_seconds),
        require_roles = COALESCE($12, require_roles),
        ignore_roles = COALESCE($13, ignore_roles),
        require_channels = COALESCE($14, require_channels),
        ignore_channels = COALESCE($15, ignore_channels),
        enabled = COALESCE($16, enabled),
        is_ephemeral = COALESCE($17, is_ephemeral),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $18
    RETURNING *;
  `;
    console.log('[updateCommand] safeTriggerType:', safeTriggerType);
    const paramArray = [
      commandCode, 
      description, 
      safeTriggerType,
      triggerOnEdit,
      caseSensitive,
      responseType,
      responseInDM,
      triggerData ? JSON.stringify(triggerData) : null,
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
    ];
    console.log('[updateCommand] SQL param array:', paramArray);
  const result = await db.query(query, [
      ...paramArray
    ]);
  console.log('[updateCommand] DB result:', result.rows);
  return parseCommandArrays(result.rows[0]);
};

// Delete command by primary id
const deleteCommand = async (commandId) => {
  const query = `
    UPDATE custom_commands
    SET is_active = false
    WHERE id = $1
    RETURNING *;
  `;
  const result = await db.query(query, [commandId]);
  return result.rows[0];
};

// Delete command by guild and command_index
const deleteCommandByIndex = async (guildId, commandIndex) => {
  const query = `
    UPDATE custom_commands
    SET is_active = false
    WHERE guild_id = $1 AND command_index = $2
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, commandIndex]);
  return result.rows[0];
};

// Get command by guild and index
const getCommandByIndex = async (guildId, commandIndex) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE guild_id = $1 AND command_index = $2 AND is_active = true AND enabled = true;
  `;
  const result = await db.query(query, [guildId, commandIndex]);
  return parseCommandArrays(result.rows[0] || null);
};

// Get command by primary id
const getCommandById = async (id) => {
  const query = `
    SELECT * FROM custom_commands
    WHERE id = $1 AND is_active = true AND enabled = true;
  `;
  const result = await db.query(query, [id]);
  return parseCommandArrays(result.rows[0] || null);
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

const refreshCustomCommands = async (guildId) => {
  // 1. Fetch all active custom commands from the database for the given guildId
  const activeCommands = await listCommands(guildId); // Reusing listCommands

  // 2. Format these commands into the Discord API format for slash commands
  const discordCommands = activeCommands.map(cmd => {
    // Basic structure for a Discord Slash Command
    // This will need to be adapted based on how your bot expects commands
    // and what options/subcommands you support.
    // For now, a simple chat input command.
    return {
      name: cmd.command_name.toLowerCase(), // Discord command names must be lowercase
      description: cmd.description || `Custom command for ${cmd.command_name}`,
      type: 1, // CHAT_INPUT type
      options: [], // Add options if your custom commands support them
      // ephemeral and other settings are handled by the bot's execution logic,
      // not directly by Discord command registration itself
    };
  });

  // 3. Make a POST request to an internal endpoint on the qft-agent (bot)
  //    passing the guildId and the formatted commands, authenticated with INTERNAL_BOT_SECRET.
  const botApiUrl = process.env.BOT_API_URL;
  const internalBotSecret = process.env.INTERNAL_BOT_SECRET;

  if (!botApiUrl || !internalBotSecret) {
    throw new Error('BOT_API_URL or INTERNAL_BOT_SECRET not configured in API Gateway environment.');
  }

  try {
    const response = await fetch(`${botApiUrl}/api/refresh-custom-commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalBotSecret, // Use internal secret for auth
      },
      body: JSON.stringify({ guildId, commands: discordCommands }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Bot internal API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error refreshing custom commands on bot:', error);
    throw new Error(`Failed to communicate with bot for command refresh: ${error.message}`);
  }
};

module.exports = {
  createCommand,
  getCommand,
  getCommandsByTrigger,
  canExecuteCommand,
  updateExecutionStats,
  listCommands,
  updateCommand,
  deleteCommand,
  deleteCommandByIndex,
  getCommandByIndex,
  getCommandById,

  importYAGPDBCommand,
  refreshCustomCommands,
};
