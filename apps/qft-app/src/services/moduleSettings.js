const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchModuleSettings(guildId, token) {
  const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/modules`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load module settings (${response.status})`);
  }

  return response.json();
}

export async function toggleModule(guildId, moduleName, enabled, token) {
  const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/modules/${moduleName}/toggle`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to toggle module (${response.status})`);
  }

  return response.json();
}

export async function setModuleSettings(guildId, modules, token) {
  const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/modules/batch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ modules }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to save module settings (${response.status})`);
  }

  return response.json();
}
