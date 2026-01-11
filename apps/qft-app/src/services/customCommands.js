const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function listCommands(guildId, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands`, {
      headers
    });
    const data = await res.json();
    return { success: data.success !== false, commands: data.commands || [], message: data.error || data.message };
  } catch (error) {
    return { success: false, commands: [], message: error.message };
  }
}

export async function getCommand(guildId, commandName, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands/index/${commandName}`, {
      headers
    });
    const data = await res.json();
    return { success: data.success !== false, command: data.command, message: data.error || data.message };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function createCommand(guildId, commandData, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commandData)
    });
    const data = await res.json();
    return { success: data.success !== false, command: data.command, message: data.error || data.message || 'Command created successfully' };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function updateCommand(guildId, commandId, commandData, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands/index/${commandId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(commandData)
    });
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      const text = await res.text();
      return { success: false, command: null, message: `HTTP ${res.status}: ${text}` };
    }
    return { success: data.success !== false, command: data.command, message: data.error || data.message || 'Command updated successfully' };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function deleteCommand(guildId, commandId, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands/index/${commandId}`, {
      method: 'DELETE',
      headers
    });
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      const text = await res.text();
      return { success: false, message: `HTTP ${res.status}: ${text}` };
    }
    return { success: data.success !== false, message: data.error || data.message || 'Command deleted successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function refreshCustomCommands(guildId, token) {
  try {
    if (!guildId) {
      return { success: false, message: 'No guild selected' };
    }
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/api/v1/bot/commands/refresh-custom`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ guildId })
    });
    let data;
    try {
      data = await res.json();
    } catch (jsonError) {
      const text = await res.text();
      return { success: false, message: `HTTP ${res.status}: ${text}` };
    }
    return { 
      success: data.success !== false, 
      message: data.message || data.error || 'Commands refreshed' 
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
