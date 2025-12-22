const vm = require('vm');
// Native fetch is available in Node 18+

const API_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';
const INTERNAL_SECRET = process.env.INTERNAL_BOT_SECRET;

async function getCommand(guildId, trigger) {
    try {
        const response = await fetch(`${API_URL}/api/internal/commands?guildId=${guildId}&trigger=${trigger}`, {
            headers: {
                'x-internal-secret': INTERNAL_SECRET
            }
        });
        if (!response.ok) {
            // 404 is expected if command doesn't exist
            if (response.status !== 404) {
                console.error(`[CommandService] Failed to fetch command: ${response.status} ${response.statusText}`);
            }
            return null;
        }
        const data = await response.json();
        return data; // Returns { command_code, ... }
    } catch (error) {
        console.error('[CommandService] Error fetching command:', error.message);
        return null;
    }
}

async function executeCommand(code, context) {
    const { message, args, client } = context;

    // Define the sandbox environment
    const sandbox = {
        // Context Variables
        args: args,
        guildId: message.guild.id,
        channelId: message.channel.id,
        authorId: message.author.id,
        
        // Helper Functions
        send: (content) => {
            if (message.channel) message.channel.send(content).catch(console.error);
        },
        reply: (content) => {
            if (message.reply) message.reply(content).catch(console.error);
        },
        log: (msg) => console.log(`[CustomCommand Log] ${msg}`),
        
        // Utilities
        random: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        
        // Safe Built-ins
        Math: Math,
        Date: Date,
        JSON: JSON,
        parseInt: parseInt,
        parseFloat: parseFloat,
        
        // Blocked/Undefined
        require: undefined,
        process: undefined,
        console: { log: (msg) => console.log(`[Sandbox] ${msg}`) }, // Safe console
    };

    try {
        // Create a context
        const vmContext = vm.createContext(sandbox);
        
        // Execute script
        const script = new vm.Script(code);
        const result = script.runInContext(vmContext, { timeout: 1000 }); // 1s timeout
        
        return { success: true, result };
    } catch (error) {
        console.error('[CommandService] Script execution error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getCommand,
    executeCommand
};
