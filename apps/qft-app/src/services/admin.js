// src/services/admin.js
const API_GATEWAY_URL = 'http://localhost:3001'; // Assuming API Gateway URL

export const fetchUsers = async (token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: [], message: errorData.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    // Assuming API returns an array of users
    return { success: true, data: data.users, message: "Users fetched successfully." };
  } catch (error) {
    console.error("Failed to fetch users for admin:", error);
    return { success: false, data: [], message: `An error occurred: ${error.message}` };
  }
};

export const updateUserRole = async (userId, newRole, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
    }

    return { success: true, message: "Role updated successfully." };
  } catch (error) {
    console.error(`Failed to update role for user ${userId} to ${newRole}:`, error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};

export const fetchGuildRoles = async (guildId, token) => {
  try {
    // This endpoint does not exist yet in API Gateway, but will be added later
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/guilds/${guildId}/roles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: [], message: errorData.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data: data, message: "Guild roles fetched successfully." };
  } catch (error) {
    console.error(`Failed to fetch roles for guild ${guildId}:`, error);
    return { success: false, data: [], message: `An error occurred: ${error.message}` };
  }
};

export const updateUserDiscordRole = async (guildId, userId, roleId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/guilds/${guildId}/members/${userId}/roles`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ roleId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
    }

    return { success: true, message: "User Discord role updated successfully." };
  } catch (error) {
    console.error(`Failed to update Discord role for user ${userId} in guild ${guildId}:`, error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};

export const fetchGuildChannels = async (guildId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/user/guilds/${guildId}/channels`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: [], message: errorData.message || `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data: data, message: "Guild channels fetched successfully." };
  } catch (error) {
    console.error(`Failed to fetch channels for guild ${guildId}:`, error);
    return { success: false, data: [], message: `An error occurred: ${error.message}` };
  }
};

export const fetchGuildConfig = async (guildId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: {}, message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, data: data.data || {}, message: 'Guild config fetched.' };
  } catch (error) {
    console.error('Failed to fetch guild config:', error);
    return { success: false, data: {}, message: `An error occurred: ${error.message}` };
  }
};

export const saveGuildConfig = async (guildId, payload, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, message: data.message || 'Saved.' };
  } catch (error) {
    console.error('Failed to save guild config:', error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};



// Custom Commands
export const listCustomCommands = async (guildId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/commands`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: {}, message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    // Convert array to object for frontend compatibility if needed, or return array
    // Backend returns { success: true, commands: [...] }
    const commandsMap = {};
    if (Array.isArray(data.commands)) {
        data.commands.forEach(cmd => {
            commandsMap[cmd.command_name] = {
                commandCode: cmd.command_code,
                description: cmd.description,
                id: cmd.id
            };
        });
    }
    return { success: true, data: commandsMap, message: 'Custom commands fetched.' };
  } catch (error) {
    console.error('Failed to list custom commands:', error);
    return { success: false, data: {}, message: `An error occurred: ${error.message}` };
  }
};

export const saveCustomCommand = async (guildId, name, commandData, token) => {
  try {
    // commandData should contain { commandCode, description }
    const payload = {
        commandName: name,
        commandCode: commandData.commandCode,
        description: commandData.description
    };
    
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/commands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, message: 'Command saved successfully.' };
  } catch (error) {
    console.error('Failed to save custom command:', error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};

export const deleteCustomCommand = async (guildId, name, token) => {
  try {
    // We need the ID to delete, but the frontend might only have the name.
    // For now, let's assume we can delete by name or we need to lookup the ID.
    // The backend route is DELETE /commands/:commandId.
    // We need to find the command ID first.
    // Ideally the frontend should pass the ID.
    // For this fix, let's assume the frontend passes the ID as 'name' if it has it, or we need to change the signature.
    // Let's change the signature in the component to pass the ID.
    
    // Wait, the backend route is /commands/:commandId.
    // If we only have the name, we can't delete easily unless we search.
    // Let's assume 'name' here is actually the 'commandId' passed from the component.
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/commands/${name}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.error || `HTTP error! status: ${response.status}` };
    }
    return { success: true, message: 'Command deleted.' };
  } catch (error) {
    console.error('Failed to delete custom command:', error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};

// Moderation
export const moderateUser = async (guildId, userId, action, payload, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/members/${userId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, message: data.message || `User ${action}ed.` };
  } catch (error) {
    console.error(`Failed to ${action} user:`, error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};

// Scheduled Embeds (Workers with schedule trigger)
export const listScheduledEmbeds = async (guildId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}/workers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, data: [], message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    // Filter for schedule triggers
    const scheduled = (data.workers || []).filter(w => {
      const trigger = typeof w.trigger === 'string' ? JSON.parse(w.trigger) : w.trigger;
      return trigger.type === 'schedule';
    });
    return { success: true, data: scheduled, message: "Scheduled embeds fetched." };
  } catch (error) {
    console.error("Failed to fetch scheduled embeds:", error);
    return { success: false, data: [], message: `An error occurred: ${error.message}` };
  }
};

export const removeScheduledEmbed = async (guildId, jobId, token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/workers/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || `HTTP error! status: ${response.status}` };
    }
    return { success: true, message: "Scheduled embed removed." };
  } catch (error) {
    console.error("Failed to remove scheduled embed:", error);
    return { success: false, message: `An error occurred: ${error.message}` };
  }
};
