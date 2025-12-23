// services/users.js - User management API calls

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export const getAllUsers = async (token) => {
  // Development-friendly fallback: if token is missing or API unreachable,
  // return a small mock payload so the UI can render while the backend is offline.
  const mockUsers = [
    {
      qft_uuid: 'mock-1',
      discord_id: '100000000000000001',
      discord_username: 'MockUserOne',
      username: 'mockuser1',
      avatar: null,
      email: 'mock1@example.com',
      roles: [{ id: 'r1', name: 'Admin', clearance_level: '3', color: '#f39c12' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      qft_uuid: 'mock-2',
      discord_id: '100000000000000002',
      discord_username: 'MockUserTwo',
      username: 'mockuser2',
      avatar: null,
      email: 'mock2@example.com',
      roles: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  if (!token) {
    console.warn('getAllUsers: no token provided, returning mock users for dev');
    return { users: mockUsers };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/permissions/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`getAllUsers: API returned ${response.status}, falling back to mock users`);
      return { users: mockUsers };
    }

    return await response.json();
  } catch (err) {
    console.warn('getAllUsers: fetch failed, returning mock users', err);
    return { users: mockUsers };
  }
};

export const getUserRoles = async (userId, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/users/${userId}/roles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user roles: ${response.status}`);
  }

  return await response.json();
};

export const assignUserRole = async (userId, roleId, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/users/${userId}/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ roleId })
  });

  if (!response.ok) {
    throw new Error(`Failed to assign role: ${response.status}`);
  }

  return await response.json();
};

export const removeUserRole = async (userId, roleId, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/users/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to remove role: ${response.status}`);
  }

  return await response.json();
};

export const getRegistryEntries = async (type, token) => {
  const response = await fetch(`${API_URL}/api/v1/registry${type ? `?type=${type}` : ''}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch registry entries: ${response.status}`);
  }

  return await response.json();
};

export const createRegistryEntry = async (entry, token) => {
  const response = await fetch(`${API_URL}/api/v1/registry`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
    throw new Error(`Failed to create registry entry: ${response.status}`);
  }

  return await response.json();
};

export const updateRegistryEntry = async (id, updates, token) => {
  const response = await fetch(`${API_URL}/api/v1/registry/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error(`Failed to update registry entry: ${response.status}`);
  }

  return await response.json();
};

export const deleteRegistryEntry = async (id, token) => {
  const response = await fetch(`${API_URL}/api/v1/registry/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete registry entry: ${response.status}`);
  }

  return await response.json();
};

export const getUsersForGuild = async (token, guildId) => {
  if (!guildId) return [];

  const mockUsers = (await getAllUsers(token)).users || [];

  if (!token) {
    console.warn('getUsersForGuild: no token provided, returning mock users for dev');
    return mockUsers;
  }

  // Try the most likely API endpoints for guild users, with graceful fallback
  const endpoints = [
    `${API_URL}/api/v1/guilds/${guildId}/users`,
    `${API_URL}/api/v1/permissions/guilds/${guildId}/users`,
    `${API_URL}/api/v1/guilds/${guildId}/members`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      // support both { users: [...] } and plain array responses
      return data.users || data.members || data || [];
    } catch (err) {
      console.debug('getUsersForGuild: endpoint failed', url, err.message);
      continue;
    }
  }

  // Fallback: return all users and let caller filter if needed
  return mockUsers;
};
