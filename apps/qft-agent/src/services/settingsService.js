// qft-agent/src/services/settingsService.js
// Fetch and cache guild settings from gateway

const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getGuildPrefix(guildId) {
  const cached = settingsCache.get(guildId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.prefix;
  }

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const internalSecret = process.env.INTERNAL_BOT_SECRET;
    
    const response = await fetch(`${apiUrl}/api/v1/guilds/${guildId}/settings`, {
      headers: { 'x-internal-secret': internalSecret }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const settings = await response.json();
    const prefix = settings.command_prefix || process.env.COMMAND_PREFIX || '!';
    
    settingsCache.set(guildId, { prefix, timestamp: Date.now() });
    return prefix;
  } catch (error) {
    console.error('[settingsService] Error fetching prefix:', error);
    return process.env.COMMAND_PREFIX || '!';
  }
}

function clearCache(guildId) {
  settingsCache.delete(guildId);
}

module.exports = {
  getGuildPrefix,
  clearCache,
};
