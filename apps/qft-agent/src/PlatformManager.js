// qft-agent/src/PlatformManager.js

class PlatformManager {
    constructor() {
        this.adapters = new Map();
        this.client = null; // Store the Discord client here for now, will be abstracted later
        this._services = new Map();
    }

    /**
     * Registers a platform adapter.
     * @param {string} platformName - The name of the platform (e.g., 'discord').
     * @param {object} adapterInstance - An instance of the platform-specific adapter.
     */
    registerAdapter(platformName, adapterInstance) {
        this.adapters.set(platformName, adapterInstance);
        console.log(`[PlatformManager] Registered adapter for ${platformName}`);
    }

    /**
     * Sets the Discord.js client instance. Temporary, will be refactored into DiscordAdapter.
     * @param {Client} clientInstance - The Discord.js client instance.
     */
    setDiscordClient(clientInstance) {
        this.client = clientInstance;
    }

    /**
     * Gets the Discord.js client instance. Temporary.
     * @returns {Client}
     */
    getDiscordClient() {
        return this.client;
    }

    setService(name, instance) {
        this._services.set(name, instance);
    }

    get(name) {
        return this.adapters.get(name) || this._services.get(name);
    }

    /**
     * Sends a message to a specific channel on a given platform.
     * @param {string} platformName - The name of the platform.
     * @param {string} channelId - The ID of the channel.
     * @param {string} message - The message content.
     * @returns {Promise<any>}
     */
    async sendMessage(platformName, channelId, message) {
        const adapter = this.adapters.get(platformName);
        if (!adapter) {
            console.warn(`[PlatformManager] No adapter registered for ${platformName}`);
            return null;
        }
        return adapter.sendMessage(channelId, message);
    }

    // Add methods for handling generic commands, events, etc.
    // For now, focusing on basic message sending and Discord client access.
}

module.exports = new PlatformManager(); // Export a singleton instance
