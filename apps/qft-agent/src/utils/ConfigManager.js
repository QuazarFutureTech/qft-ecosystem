const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'db', 'guildConfigs.json');

let guildConfigs = {};

class ConfigManager {
    static load() {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            guildConfigs = JSON.parse(raw);
            console.log('[ConfigManager] Loaded guild configs.');
        } catch (err) {
            console.warn('[ConfigManager] No existing config file, starting fresh.');
            guildConfigs = {};
            ConfigManager._save();
        }
    }

    static _save() {
        try {
            const tmp = CONFIG_FILE + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(guildConfigs, null, 4));
            fs.renameSync(tmp, CONFIG_FILE);
        } catch (err) {
            console.error('[ConfigManager] Failed to persist configs:', err);
        }
    }

    static getGuild(guildId) {
        if (!guildConfigs[guildId]) {
            guildConfigs[guildId] = {
                meta: { createdAt: Date.now() },
                settings: {},
                history: [],
            };
        }
        return guildConfigs[guildId];
    }

    static get(guildId, key, fallback = undefined) {
        const g = ConfigManager.getGuild(guildId);
        return key ? (g.settings[key] ?? fallback) : g.settings;
    }

    static set(guildId, key, value, meta = {}) {
        const g = ConfigManager.getGuild(guildId);
        // push a snapshot to history for rollback
        g.history.push({ ts: Date.now(), key, old: g.settings[key], meta });
        g.settings[key] = value;
        ConfigManager._save();
        return true;
    }

    static rollback(guildId, steps = 1) {
        const g = ConfigManager.getGuild(guildId);
        if (!g.history.length || steps <= 0) return false;
        for (let i = 0; i < steps; i++) {
            const entry = g.history.pop();
            if (!entry) break;
            if (entry.key) {
                if (entry.old === undefined) delete g.settings[entry.key];
                else g.settings[entry.key] = entry.old;
            }
        }
        ConfigManager._save();
        return true;
    }

    // Category toggles helper
    static isCategoryEnabled(guildId, category) {
        const value = ConfigManager.get(guildId, 'categories', {});
        if (!value || typeof value !== 'object') return true; // default on
        return value[category] !== false;
    }
}

// initialize on import
ConfigManager.load();

module.exports = ConfigManager;
