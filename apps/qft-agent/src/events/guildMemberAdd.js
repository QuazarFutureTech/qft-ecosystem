const ConfigManager = require('../utils/ConfigManager');
const logService = require('../services/logService');
const workerService = require('../services/workerService');
const welcomeImage = require('../modules/welcomeImage');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        const guildId = member.guild.id;
        const userId = member.id;

        // ===== LOG MEMBER JOIN (Production) =====
        try {
            await logService.logAction(guildId, 'member_join', 'system', {
                memberId: userId,
                username: member.user.username,
                joinedAt: member.joinedAt?.toISOString(),
                accountAge: Date.now() - member.user.createdTimestamp,
            }, userId, null, client);
        } catch (error) {
            console.error('Error logging member join:', error);
        }

        // ===== WORKER TRIGGERS (user_join) =====
        try {
            const workers = await workerService.listWorkers(guildId, 'active');
            for (const worker of workers) {
                const trigger = JSON.parse(worker.trigger);
                if (trigger.type === 'user_join') {
                    const triggerData = { member, guild: member.guild, user: member.user };
                    await workerService.executeWorker(worker.id, triggerData);
                }
            }
        } catch (error) {
            console.error('Error executing user_join workers:', error);
        }

        // --- Welcome message with optional image ---
        const welcome = ConfigManager.get(guildId, 'welcome');
        if (!welcome || !welcome.channelId) return;
        const channel = member.guild.channels.cache.get(welcome.channelId);
        if (!channel) return;

        const template = welcome.template || 'Welcome {user} to {guild}! You are member #{memberCount}.';
        const text = template.replace('{user}', `<@${member.id}>`).replace('{guild}', member.guild.name).replace('{memberCount}', member.guild.memberCount);
        
        // Check if welcome images are enabled
        const imageSettings = welcome.imageSettings || {};
        const imageEnabled = imageSettings.enabled === true;

        try {
            if (imageEnabled) {
                // Generate welcome image
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
                const imageBuffer = await welcomeImage.generate({
                    username: member.user.username,
                    serverName: member.guild.name,
                    avatarUrl: avatarUrl,
                    welcomeMessage: imageSettings.message || 'Welcome to the server!',
                    background: imageSettings.background || 'default.png',
                    textColor: imageSettings.textColor || '#FFFFFF',
                    circularAvatar: imageSettings.circularAvatar !== false,
                    memberCount: member.guild.memberCount
                });

                // Send message with image attachment
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
                await channel.send({ 
                    content: text,
                    files: [attachment]
                });
            } else {
                // Send text-only message
                await channel.send({ content: text });
            }
        } catch (error) {
            console.error('Error sending welcome message:', error);
            // Fallback to text-only if image generation fails
            channel.send({ content: text }).catch(() => {});
        }
    }
};
