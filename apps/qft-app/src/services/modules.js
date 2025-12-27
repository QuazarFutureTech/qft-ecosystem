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
