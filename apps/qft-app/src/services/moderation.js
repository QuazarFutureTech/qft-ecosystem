// Moderation service - API calls for user moderation actions

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const banUser = async (guildId, userId, reason, deleteMessageDays = 0, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/moderation/guilds/${guildId}/members/${userId}/ban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason, deleteMessageDays })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false, error: error.message };
  }
};

export const kickUser = async (guildId, userId, reason, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/moderation/guilds/${guildId}/members/${userId}/kick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error kicking user:', error);
    return { success: false, error: error.message };
  }
};

export const timeoutUser = async (guildId, userId, reason, duration = 60, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/moderation/guilds/${guildId}/members/${userId}/timeout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason, duration })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error timing out user:', error);
    return { success: false, error: error.message };
  }
};

export const warnUser = async (guildId, userId, reason, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/moderation/guilds/${guildId}/members/${userId}/warn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error warning user:', error);
    return { success: false, error: error.message };
  }
};

export const unbanUser = async (guildId, userId, reason, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/moderation/guilds/${guildId}/members/${userId}/unban`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error unbanning user:', error);
    return { success: false, error: error.message };
  }
};
