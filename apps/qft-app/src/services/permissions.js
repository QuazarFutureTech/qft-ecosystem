// services/permissions.js - Permissions API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getRoles = async (token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.status}`);
  }

  return await response.json();
};

export const getPermissions = async (token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/permissions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch permissions: ${response.status}`);
  }

  return await response.json();
};

export const getRolePermissions = async (roleId, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles/${roleId}/permissions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch role permissions: ${response.status}`);
  }

  return await response.json();
};

export const updateRolePermissions = async (roleId, permissions, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles/${roleId}/permissions`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ permissions })
  });

  if (!response.ok) {
    throw new Error(`Failed to update role permissions: ${response.status}`);
  }

  return await response.json();
};

export const createRole = async (roleData, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(roleData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create role: ${response.status}`);
  }

  return await response.json();
};

export const updateRole = async (roleId, updates, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles/${roleId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error(`Failed to update role: ${response.status}`);
  }

  return await response.json();
};

export const deleteRole = async (roleId, token) => {
  const response = await fetch(`${API_URL}/api/v1/permissions/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to delete role: ${response.status}`);
  }

  return await response.json();
};
