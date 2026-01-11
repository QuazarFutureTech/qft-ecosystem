require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, ActivityType, Collection } = require('discord.js');
const http = require('http'); // Required for Cloud Run Health Check
const { commands, commandMap } = require('./commands');

// --- 1. CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.HOME_GUILD_ID; // Your Support Server ID
const API_URL = process.env.API_URL || 'http://localhost:3001'; // Points to qft-api-gateway
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET;
const DEFAULT_PREFIX = process.env.COMMAND_PREFIX || '?';
const PORT = process.env.PORT || 8080; // Cloud Run injects 8080 automatically

// Cache for guild prefixes to reduce API spam
const prefixCache = new Map();

// Fail fast if token is missing
if (!TOKEN) {
    console.error('❌ Lumakio: DISCORD_TOKEN is missing. Set it in .env or your environment.');
    process.exit(1);
}

// --- 2. INITIALIZE CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Load commands into Collection for easy access
client.commands = new Collection();
if (commands && Array.isArray(commands)) {
    commands.forEach(c => client.commands.set(c.name, c));
}

// --- 3. SLASH COMMAND REGISTRATION ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

async function refreshCommands() {
    try {
        console.log('🔄 Lumakio: Refreshing application (/) commands...');
        
        const slashPayload = commands.map(cmd => ({
            name: cmd.slash.name,
            description: cmd.slash.description,
            options: cmd.slash.options || [],
        }));

        if (GUILD_ID) {
            // Instant update for Support Server
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: slashPayload });
            console.log(`✅ Lumakio: Registered commands to Guild: ${GUILD_ID}`);
        } else {
            // Global update (takes ~1 hour to propagate)
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashPayload });
            console.log('✅ Lumakio: Registered Global commands.');
        }
    } catch (error) {
        console.error('❌ Lumakio: Command registration failed:', error);
    }
}

// --- 4. EVENT HANDLERS ---

client.once('ready', () => {
    console.log(`⚡ Lumakio System Online. Logged in as ${client.user.tag}`);
    client.user.setActivity('Your perfect server companion', { type: ActivityType.Watching });
    refreshCommands();
});

// Slash Command Handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = commandMap.get(interaction.commandName);
    if (!cmd || !cmd.executeSlash) return;

    try {
        await cmd.executeSlash(interaction, client, [], commands);
    } catch (err) {
        console.error(`[Slash:${interaction.commandName}]`, err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Something went wrong executing this command.', ephemeral: true });
        } else {
            await interaction.followUp({ content: 'Something went wrong executing this command.', ephemeral: true });
        }
    }
});

// Message Command Handler (Prefix)
client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    // 1. Determine Prefix (Cache First -> API Fallback -> Default)
    let prefix = prefixCache.get(message.guildId);
    
    if (!prefix) {
        try {
            // Note: Node 18+ has native fetch, no need for require('node-fetch')
            const response = await fetch(`${API_URL}/api/v1/guilds/${message.guildId}/settings`, {
                method: 'GET',
                headers: { 'x-internal-secret': INTERNAL_BOT_SECRET, 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const settings = await response.json();
                prefix = settings.command_prefix || DEFAULT_PREFIX;
            } else {
                prefix = DEFAULT_PREFIX;
            }
        } catch (err) {
            // API might be down or unreachable, fall back gracefully
            console.warn(`[Prefix Fetch] Failed for guild ${message.guildId}, using default.`);
            prefix = DEFAULT_PREFIX;
        }
        // Cache it for 5 minutes (or whatever logic you prefer) to save API calls
        prefixCache.set(message.guildId, prefix);
    }

    // 2. Check Prefix
    if (!message.content.startsWith(prefix)) return;

    // 3. Parse Args
    const withoutPrefix = message.content.slice(prefix.length).trim();
    const [name, ...args] = withoutPrefix.split(/\s+/);
    
    // 4. Execute
    const cmd = commandMap.get(name.toLowerCase());
    if (!cmd || !cmd.executeMessage) return;

    try {
        await cmd.executeMessage(message, client, args, commands);
    } catch (err) {
        console.error(`[Msg:${name}]`, err);
        await message.reply('Something went wrong executing this command.');
    }
});

// --- 5. GLOBAL ERROR HANDLERS ---
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled Promise Rejection:', reason);
});

client.on('error', (error) => {
    console.error('⚠️ Discord Client Error:', error);
});

// --- 6. CLOUD RUN HEALTH CHECK (CRITICAL) ---
// This tiny web server satisfies Google's "Port 8080" requirement.
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Lumakio is Online ⚡');
});

server.listen(PORT, () => {
    console.log(`✅ Health Check Server listening on port ${PORT}`);
    
    // Only login AFTER server is listening to ensure smooth startup
    client.login(TOKEN);
});