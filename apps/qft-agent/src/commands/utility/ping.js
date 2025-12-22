// src/commands/utility/ping.js

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with the bot and API latency.'),
    
    // The execute function now explicitly accepts the client object
    async execute(interaction, client) { 
        // 1. Send immediate response to avoid timeout
        const sent = await interaction.reply({ content: 'Pinging QFT systems...', fetchReply: true });
        
        // 2. Calculations using the client object
        const messageLatency = sent.createdTimestamp - interaction.createdTimestamp;
        // Use client.ws.ping directly (passed from interactionCreate)
        const apiLatency = client.ws.ping; 

        // 3. Edit the initial message
        await interaction.editReply(
            `Pong! 🏓\n` +
            `**Message Latency:** ${messageLatency}ms\n` +
            `**API Latency:** ${apiLatency}ms`
        );
    },
};