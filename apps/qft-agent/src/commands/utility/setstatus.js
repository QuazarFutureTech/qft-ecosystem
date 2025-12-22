// src/commands/utility/setstatus.js

const { SlashCommandBuilder, ActivityType } = require('discord.js');
const SettingsHandler = require('../../utils/SettingsHandler'); // Import the Settings Handler

// Define the mapping for user-friendly text options to Discord.js ActivityType constants
const activityTypeMap = {
    'Playing': ActivityType.Playing,
    'Listening': ActivityType.Listening,
    'Watching': ActivityType.Watching,
    'Competing': ActivityType.Competing,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstatus')
        .setDescription('Change the bot’s status and presence (OWNER ONLY).')
        // Option 1: The type of activity (Playing, Watching, etc.)
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('The activity type (e.g., Playing, Watching)')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing', value: 'Playing' },
                    { name: 'Listening', value: 'Listening' },
                    { name: 'Watching', value: 'Watching' },
                    { name: 'Competing', value: 'Competing' },
                ))
        // Option 2: The text to display
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The status text (e.g., Monitoring QFT Contracts)')
                .setRequired(true))
        // Option 3: The overall presence status (online, idle, dnd, invisible)
        .addStringOption(option =>
            option.setName('status')
                .setDescription('The overall presence status (online, idle, dnd, invisible)')
                .setRequired(false)
                .addChoices(
                    { name: 'Online', value: 'online' },
                    { name: 'Idle', value: 'idle' },
                    { name: 'Do Not Disturb', value: 'dnd' },
                    { name: 'Invisible', value: 'invisible' },
                )),

    async execute(interaction, client) {
        // --- 1. OWNER CHECK (Critical Security Step) ---
        const ownerId = SettingsHandler.get('ownerId');
        
        if (!ownerId || interaction.user.id !== ownerId) {
            return interaction.reply({ 
                content: '❌ **Access Denied:** Only the QFT Agent Owner can use this command. Set the `ownerId` in `globalSettings.json` to your ID.', 
                ephemeral: true 
            });
        }
        
        // --- 2. Parsing Options ---
        const activityChoice = interaction.options.getString('activity');
        const statusText = interaction.options.getString('text');
        // Default to 'online' if the user doesn't specify an overall status
        const statusChoice = interaction.options.getString('status') || 'online'; 
        const activityType = activityTypeMap[activityChoice];


        try {
            // --- 3. Update Discord Presence ---
            client.user.setPresence({
                activities: [{ 
                    name: statusText, 
                    type: activityType // Use the mapped ActivityType constant
                }],
                status: statusChoice,
            });

            // --- 4. Persist to Global Settings ---
            SettingsHandler.set('status', {
                text: statusText,
                type: activityType,
                name: activityChoice,
                status: statusChoice
            });

            // --- 5. Confirmation Reply ---
            await interaction.reply({
                content: `✅ QFT Agent Status Updated! \n**Activity:** ${activityChoice} \n**Text:** "${statusText}" \n**Status:** ${statusChoice}`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error setting status:', error);
            await interaction.reply({
                content: '❌ Failed to update status. Check bot permissions or Discord API limits.',
                ephemeral: true
            });
        }
    },
};