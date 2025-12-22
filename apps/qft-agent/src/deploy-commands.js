// src/deploy-commands.js (Modular Loader)
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// --- Command Loading Function (Recursive) ---
function loadCommandDefinitions(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Recursively load commands from subdirectories
            loadCommandDefinitions(filePath);
        } else if (file.endsWith('.js')) {
            try {
                // Load the command file (e.g., kick.js)
                const command = require(filePath);
                
                // Critical check: Ensure the file exports the 'data' (SlashCommandBuilder) property
                if ('data' in command) {
                    // Convert the data object to the JSON format required by the Discord API
                    commands.push(command.data.toJSON());
                    console.log(`[QFT-Deploy] Found command: ${command.data.name}`);
                } else {
                    console.warn(`[QFT-Deploy] Command file ${filePath} is missing the required "data" property.`);
                }
            } catch (err) {
                console.error(`[QFT-Deploy] Error loading command ${filePath}:`, err.message);
            }
        }
    }
}

// Start the loading process
loadCommandDefinitions(commandsPath);

console.log(`Found ${commands.length} application commands to deploy to Discord.`);

// --- API Deployment Logic ---
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        if (!process.env.CLIENT_ID || !process.env.GUILD_ID) {
            console.error('❌ Missing CLIENT_ID or GUILD_ID in .env');
            process.exit(1);
        }

        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        // The target scope for deployment (using Guild scope for faster testing)
        const targetRoute = Routes.applicationGuildCommands(
            process.env.CLIENT_ID, 
            process.env.GUILD_ID
        );

        const data = await rest.put(
            targetRoute,
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during command deployment:', error.message || error);
        process.exit(1);
    }
})();