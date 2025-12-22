// apps/qft-app/src/services/customCommands.js
// API service for YAGPDB-style custom commands

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export async function listCommands(guildId, token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { success: data.success !== false, commands: data.commands || [], message: data.error || data.message };
  } catch (error) {
    return { success: false, commands: [], message: error.message };
  }
}

export async function getCommand(guildId, commandName, token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands/${commandName}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return { success: data.success !== false, command: data.command, message: data.error || data.message };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function createCommand(guildId, commandData, token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(commandData)
    });
    const data = await res.json();
    return { success: data.success !== false, command: data.command, message: data.error || data.message || 'Command created successfully' };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function updateCommand(commandId, commandData, token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/commands/${commandId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(commandData)
    });
    const data = await res.json();
    return { success: data.success !== false, command: data.command, message: data.error || data.message || 'Command updated successfully' };
  } catch (error) {
    return { success: false, command: null, message: error.message };
  }
}

export async function deleteCommand(commandId, token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/commands/${commandId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
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
    
    const res = await fetch(`${API_URL}/api/v1/bot/commands/refresh-custom`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ guildId })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, message: `HTTP ${res.status}: ${errorText}` };
    }
    
    const data = await res.json();
    return { 
      success: data.success !== false, 
      message: data.message || data.error || 'Commands refreshed' 
    };
  } catch (error) {
    console.error('refreshCustomCommands error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
}
