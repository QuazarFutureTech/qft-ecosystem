const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'db', 'globalSettings.json');

// Private variable to hold the settings in memory
let settingsCache = {};

class SettingsHandler {

    /**
     * Loads settings from the JSON file into memory (the cache).
     * Should be called ONCE during bot startup.
     */
    static loadSettings() {
        try {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            settingsCache = JSON.parse(data);
            console.log('[QFT-Settings] Settings successfully loaded from file.');
        } catch (error) {
            console.error(`[QFT-Settings] ERROR: Could not load settings file at ${SETTINGS_FILE}. Using default empty object.`);
            settingsCache = {}; // Fallback to an empty object
        }
    }

    /**
     * Gets a specific setting or the entire settings object.
     * @param {string} key - Optional key to retrieve (e.g., 'prefix').
     * @returns {*} The value of the key or the entire settings object.
     */
    static get(key) {
        if (!key) {
            return settingsCache;
        }
        // Use a defensive copy to prevent accidental outside modification of the cache
        return settingsCache[key]; 
    }

    /**
     * Updates a setting in memory and saves the entire file to disk.
     * @param {string} key - The setting key to update.
     * @param {*} value - The new value for the setting.
     * @returns {boolean} True if the setting was saved successfully.
     */
    static set(key, value) {
        if (!key) return false;

        settingsCache[key] = value;
        
        try {
            // Write the updated cache back to the file
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsCache, null, 4));
            console.log(`[QFT-Settings] Updated and saved setting: ${key}`);
            return true;
        } catch (error) {
            console.error(`[QFT-Settings] ERROR: Failed to save settings file for key: ${key}`, error);
            return false;
        }
    }
}

module.exports = SettingsHandler;