// src/services/user.js
const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

// Enrich raw API response with derived flags
export const enrichUserStatus = (data) => ({
  ...data,
  id: data.discord_id, // Map discord_id to id for consistency with Discord API object structure
  isAdmin: data.is_owner === true,
  isStaff: data.role === 'staff' || data.role === 'admin'
});

// Generate bot invite URL
export const generateBotInviteUrl = (discordClientId, scopes, permissions) => {
  if (!discordClientId) return null;
  return `https://discord.com/oauth2/authorize?client_id=${discordClientId}&scope=${scopes}&permissions=${permissions}`;
};

// Build Discord avatar URL
export const getAvatarUrl = (user) => {
  if (!user?.id) return null;
  if (user.avatar) {
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}`;
  }
  // Default Discord avatar for users without a custom avatar (uses discriminator or a fallback based on user ID)
  // Discord's default avatar logic uses (user.id >> 22) % 6 for new usernames without discriminators
  // or (user.discriminator % 5) for old usernames with discriminators.
  // Assuming `user.discriminator` is not available for new usernames from our API,
  // we can use a generic fallback based on user.id or a predefined default.
  // For simplicity, using a common pattern for default avatars.
  return `https://cdn.discordapp.com/embed/avatars/${(user.id >> 22) % 6}.png`;
};

// Build Discord guild icon URL
export const getGuildIconUrl = (guild) => {
  if (!guild?.id) return null;
  if (guild.icon) {
    const format = guild.icon.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${format}`;
  }
  return null; // Return null if no guild icon, let UI handle placeholder
};

// Parse Discord public_flags into badge names
export const parseBadges = (flags) => {
  if (!flags) return [];
  const badges = [];

  // Full bitfield mapping based on Discord API documentation
  // Source: https://discord.com/developers/docs/resources/user#user-object-user-flags
  if (flags & (1 << 0)) badges.push("Discord Employee"); // Discord Staff
  if (flags & (1 << 1)) badges.push("Partnered Server Owner");
  if (flags & (1 << 2)) badges.push("HypeSquad Events");
  if (flags & (1 << 3)) badges.push("Bug Hunter Level 1");
  // 1 << 4 (House Bravery) - This is HypeSquad Bravery
  if (flags & (1 << 6)) badges.push("HypeSquad Bravery");
  // 1 << 7 (House Brilliance) - This is HypeSquad Brilliance
  if (flags & (1 << 8)) badges.push("HypeSquad Brilliance");
  // 1 << 9 (House Balance) - This is HypeSquad Balance
  if (flags & (1 << 10)) badges.push("HypeSquad Balance");
  if (flags & (1 << 11)) badges.push("Early Supporter");
  if (flags & (1 << 12)) badges.push("Team User");
  // 1 << 13 (System)
  if (flags & (1 << 14)) badges.push("Bug Hunter Level 2");
  if (flags & (1 << 16)) badges.push("Verified Bot");
  if (flags & (1 << 17)) badges.push("Early Verified Bot Developer");
  if (flags & (1 << 18)) badges.push("Discord Certified Moderator");
  if (flags & (1 << 19)) badges.push("Bot HTTP Interactions"); // Active Developer (renamed)

  return badges;
};

// Handle bot kick
export const handleKickBot = async (guildId, guildName, token, setUserGuilds) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/guilds/${guildId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (response.ok) {
      setUserGuilds(prev => prev.filter(g => g.id !== guildId));
      return { success: true, message: `Successfully kicked bot from ${guildName}.` }; // Return result
    } else {
      const errorData = await response.json();
      return { success: false, message: errorData.message || "Failed to kick bot." }; // Return error
    }
  } catch (error) {
    console.error("Kick bot failed:", error);
    return { success: false, message: `An error occurred: ${error.message}` }; // Return error
  }
};

// Handle deploy commands
export const handleDeployCommands = async (token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/bot/commands/deploy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, message: `✅ Success! Reloaded ${data.count} commands.` }; // Return result
    } else {
      return { success: false, message: `❌ Failed: ${data.message}` }; // Return error
    }
  } catch (error) {
    console.error("Deploy failed:", error);
    return { success: false, message: `An error occurred: ${error.message}` }; // Return error
  }
};

export const fetchUserStatus = async (token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/user/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status !== 200) return null; // Return null on non-200 status
    const data = await response.json();
    if (data.connections && typeof data.connections === 'string') {
      try {
        data.connections = JSON.parse(data.connections);
      } catch (e) {
        console.error("Failed to parse connections JSON:", e);
        data.connections = []; // Default to empty array on parse error
      }
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch user status:", error);
    return null; // Return null on error
  }
};

export const fetchUserGuilds = async (token) => {
  try {
    const response = await fetch(`${API_GATEWAY_URL}/api/v1/user/guilds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status !== 200) return []; // Return empty array on non-200 status
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch user guilds:", error);
    return []; // Return empty array on error
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
    return { success: true, data: data, message: "Channels fetched successfully." };
  } catch (error) {
    console.error(`Failed to fetch channels for guild ${guildId}:`, error);
    return { success: false, data: [], message: `An error occurred: ${error.message}` };
  }
};