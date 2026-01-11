const fetch = require('node-fetch');
const API_GATEWAY_URL = process.env.QFT_API_GATEWAY_URL || 'http://localhost:3001';

// No local file storage; always fetch live

class ConfigManager {
    // Save config to API Gateway
    static async setGuildConfig(guildId, config) {
        try {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/config`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${process.env.QFT_AGENT_SECRET || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            console.log('[ConfigManager] Saved config for', guildId);
            return data;
        } catch (err) {
            console.error('[ConfigManager] Failed to save config for guild', guildId, err.message);
            return { success: false, error: err.message };
        }
    }
    // Fetch config from API Gateway
    static async fetchGuildConfig(guildId) {
        try {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/config`, {
                headers: { 'Authorization': `Bearer ${process.env.QFT_AGENT_SECRET || ''}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Debug: log config
            console.log('[ConfigManager] API config for', guildId, JSON.stringify(data.settings));
            return data.settings || {};
        } catch (err) {
            console.error('[ConfigManager] Failed to fetch config for guild', guildId, err.message);
            return {};
        }
    }

    // Async get for a key (deep path support)
    static async get(guildId, key, fallback = undefined) {
        const settings = await ConfigManager.fetchGuildConfig(guildId);
        console.log(`[ConfigManager] get for guild ${guildId}:`, JSON.stringify(settings));
        if (!key) return settings;
        // Support deep keys like 'automod.enabled'
        if (key.includes('.')) {
            const parts = key.split('.');
            let val = settings;
            for (const part of parts) {
                if (val && typeof val === 'object' && part in val) val = val[part];
                else return fallback;
            }
            return val !== undefined ? val : fallback;
        }
        return settings[key] !== undefined ? settings[key] : fallback;
    }

    // Async category toggle check
    static async isCategoryEnabled(guildId, category) {
        const categories = await ConfigManager.get(guildId, 'categories', {});
        console.log(`[ConfigManager] isCategoryEnabled for guild ${guildId}, category '${category}':`, JSON.stringify(categories));
        if (!categories || typeof categories !== 'object') return true;
        return categories[category] !== false;
    }
}



module.exports = ConfigManager;
