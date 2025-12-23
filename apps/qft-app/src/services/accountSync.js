// services/accountSync.js - Account Sync API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const syncGuildAccounts = async (guildId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/sync-accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to sync accounts: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing accounts:', error);
    throw error;
  }
};

export const getSyncedAccounts = async (guildId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/synced-accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch synced accounts: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching synced accounts:', error);
    throw error;
  }
};

export const updateAccountRole = async (accountId, role, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/synced-accounts/${accountId}/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      throw new Error(`Failed to update account role: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating account role:', error);
    throw error;
  }
};

export const linkAccountToStaff = async (accountId, staffProfileId, token) => {
  try {
    const response = await fetch(`${API_URL}/api/v1/synced-accounts/${accountId}/link-staff`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ staffProfileId })
    });

    if (!response.ok) {
      throw new Error(`Failed to link account: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error linking account:', error);
    throw error;
  }
};
