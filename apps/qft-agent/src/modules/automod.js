const ConfigManager = require('../utils/ConfigManager');
const Logger = require('../utils/logger');

// Simple in-memory rate limiter per guild+user
class AutoMod {
    constructor() {
        this.track = new Map(); // guildId -> Map(userId -> {count, lastTs})
        setInterval(() => this._cleanup(), 60 * 1000);
    }

    _getUserBucket(guildId, userId) {
        if (!this.track.has(guildId)) this.track.set(guildId, new Map());
        const g = this.track.get(guildId);
        if (!g.has(userId)) g.set(userId, { count: 0, lastTs: 0 });
        return g.get(userId);
    }

    _cleanup() {
        const cutoff = Date.now() - 1000 * 60 * 5; // 5 minutes
        for (const [gid, users] of this.track.entries()) {
            for (const [uid, bucket] of users.entries()) {
                if (bucket.lastTs < cutoff) users.delete(uid);
            }
            if (!users.size) this.track.delete(gid);
        }
    }

    async checkMessage(message) {
        if (!message.guild) return { action: 'ignore' };
        const guildId = message.guild.id;

        // Check config toggles
        if (!ConfigManager.isCategoryEnabled(guildId, 'automod')) return { action: 'disabled' };

        const content = message.content || '';

        // Link filter
        if (/https?:\/\//i.test(content)) {
            try {
                await message.delete();
                return { action: 'delete', reason: 'link' };
            } catch (err) {
                Logger.error('Failed to delete link message', { err: err.message });
            }
        }

        // Caps filter (simple heuristic)
        const letters = content.replace(/[^A-Za-z]/g, '');
        if (letters.length >= 10) {
            const capsRatio = (content.replace(/[^A-Z]/g, '').length) / letters.length;
            if (capsRatio > 0.8) {
                try {
                    await message.delete();
                    return { action: 'delete', reason: 'caps' };
                } catch (err) {
                    Logger.warn('Failed to delete caps message', { err: err.message });
                }
            }
        }

        // Basic spam rate limiter
        const bucket = this._getUserBucket(guildId, message.author.id);
        const now = Date.now();
        if (now - bucket.lastTs > 5000) bucket.count = 0;
        bucket.count += 1;
        bucket.lastTs = now;
        if (bucket.count >= 6) {
            try {
                await message.delete();
                return { action: 'delete', reason: 'spam' };
            } catch (err) {
                Logger.warn('Failed to delete spam message', { err: err.message });
            }
        }

        return { action: 'allow' };
    }
}

module.exports = new AutoMod();
