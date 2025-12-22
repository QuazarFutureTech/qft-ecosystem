const { ChannelType } = require('discord.js');
const logger = require('../utils/logger');

class BackupService {
  constructor(client) {
    this.client = client;
  }

  async generateBackup(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) throw new Error('Guild not found');

      // Export roles
      const roles = (await guild.roles.fetch()).map(r => ({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString(), // Convert BigInt to string
        isEveryone: r.id === guild.id
      }));

      // Export channels
      const channels = (await guild.channels.fetch()).map(c => {
        if (!c) return null;
        return {
          name: c.name,
          type: c.type,
          topic: c.topic,
          nsfw: c.nsfw,
          position: c.position,
          parentId: c.parentId, // We might need to resolve this to name or position for restore
          parentName: c.parent ? c.parent.name : null,
          ...(c.isVoiceBased() && { bitrate: c.bitrate, userLimit: c.userLimit }),
          ...(c.isTextBased() && { defaultAutoArchiveDuration: c.defaultAutoArchiveDuration }),
        };
      }).filter(c => c !== null);

      // Export guild settings
      const backupData = {
        name: guild.name,
        description: guild.description,
        icon: guild.iconURL({ size: 1024 }),
        banner: guild.bannerURL({ size: 1024 }),
        afkChannel: guild.afkChannel?.name,
        afkTimeout: guild.afkTimeout,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter: guild.explicitContentFilter,
        verificationLevel: guild.verificationLevel,
        roles,
        channels,
        createdAt: guild.createdAt.toISOString(),
      };

      return backupData;
    } catch (error) {
      logger.error(`Error generating backup for guild ${guildId}:`, error);
      throw error;
    }
  }

  async restoreBackup(guildId, backupData) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) throw new Error('Guild not found');

      // Note: Full restore is complex and dangerous. 
      // For this MVP, we will just log that we received the request.
      // In a real production app, we would delete/create roles and channels.
      
      logger.info(`Restoring backup for guild ${guild.name} (${guildId})`);
      
      // TODO: Implement actual restore logic
      // 1. Clear existing channels/roles (dangerous!)
      // 2. Create roles
      // 3. Create categories
      // 4. Create channels
      
      return { success: true, message: 'Backup restore initiated (Simulation)' };
    } catch (error) {
      logger.error(`Error restoring backup for guild ${guildId}:`, error);
      throw error;
    }
  }
}

module.exports = BackupService;
