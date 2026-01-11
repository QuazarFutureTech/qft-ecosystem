export async function fetchGuildModules(guildId, token) {
  const response = await fetch(`${API_URL}/api/v1/modules/guilds/${guildId}/modules`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch guild modules: ${response.status}`);
  }
  return await response.json();
}

export async function setGuildModuleEnabled(guildId, moduleKey, enabled, token) {
  const response = await fetch(`${API_URL}/api/v1/modules/guilds/${guildId}/modules/${moduleKey}/enable`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) {
    throw new Error(`Failed to set module enabled: ${response.status}`);
  }
  return await response.json();
}
// apps/qft-app/src/services/modules.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const listModules = async (token) => {
  const response = await fetch(`${API_URL}/api/v1/modules/pages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch modules: ${response.status}`);
  }

  return await response.json();
};
