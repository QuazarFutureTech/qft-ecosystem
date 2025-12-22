// services/activityLogs.js - Activity Logs API calls

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001';

export const getActivityLogs = async (filters, token) => {
  const params = new URLSearchParams();
  
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.action) params.append('action', filters.action);
  if (filters.resourceType) params.append('resourceType', filters.resourceType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await fetch(`${API_URL}/api/v1/activity-logs?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activity logs: ${response.status}`);
  }

  return await response.json();
};

export const getActivityStats = async (days, token) => {
  const response = await fetch(`${API_URL}/api/v1/activity-logs/stats?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activity stats: ${response.status}`);
  }

  return await response.json();
};

export const getUserActivity = async (userId, limit, token) => {
  const response = await fetch(`${API_URL}/api/v1/activity-logs/user/${userId}?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user activity: ${response.status}`);
  }

  return await response.json();
};
