// services/workers.js - AI Worker Management API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getWorkers = async (guildId, token, state = null) => {
  try {
    const url = state 
      ? `${API_URL}/api/v1/guilds/${guildId}/workers?state=${state}`
      : `${API_URL}/api/v1/guilds/${guildId}/workers`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workers: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching workers:', error);
    throw error;
  }
};

export const createWorker = async (guildId, workerData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/workers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workerData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create worker: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating worker:', error);
    throw error;
  }
};

export const updateWorker = async (workerId, updates, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/workers/${workerId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update worker: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating worker:', error);
    throw error;
  }
};

export const deleteWorker = async (workerId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/workers/${workerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete worker: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting worker:', error);
    throw error;
  }
};

export const updateWorkerState = async (workerId, lifecycleState, token) => {
  return updateWorker(workerId, { lifecycleState }, token);
};
