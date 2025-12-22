// services/users.js - User management API calls

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export const getAllUsers = async (token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }

  return await response.json();
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
