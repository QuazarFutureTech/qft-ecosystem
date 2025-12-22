// apps/qft-app/src/services/discord.js

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export const sendRpcActivity = async (activity, token) => {
    try {
        const response = await fetch(`${API_GATEWAY_URL}/api/v1/discord/rpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ activity }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send RPC activity:', errorData);
            throw new Error(errorData.message || 'Failed to send RPC activity');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in sendRpcActivity:', error);
        throw error;
    }
};

export async function fetchGuildChannels(guildId, token) {
  const url = `${API_GATEWAY_URL}/api/v1/discord/guilds/${guildId}/channels`;
  console.log('[discord.js] Fetching channels from:', url);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('[discord.js] Channels response:', res.status, data);
    return data;
  } catch (error) {
    console.error('[discord.js] Error fetching channels:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchGuildRoles(guildId, token) {
  const url = `${API_GATEWAY_URL}/api/v1/discord/guilds/${guildId}/roles`;
  console.log('[discord.js] Fetching roles from:', url);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('[discord.js] Roles response:', res.status, data);
    return data;
  } catch (error) {
    console.error('[discord.js] Error fetching roles:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchGuildMembers(guildId, token, limit = 100) {
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/v1/discord/guilds/${guildId}/members?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const postEmbed = async ({ guildId, channelId, embed, components }, token) => {
    try {
        const payload = { ...embed };
        if (components) {
            payload.components = components;
        }
        
        const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/channels/${channelId}/embed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to post embed');
        }
        return data;
    } catch (error) {
        console.error('Error in postEmbed:', error);
        throw error;
    }
};