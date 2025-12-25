// apps/qft-app/src/services/ticketService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthToken = () => localStorage.getItem('qft-token');

export const ticketService = {
  async listTickets(guildId, status = 'open') {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found.');
    }

    const url = new URL(`${API_URL}/api/v1/guilds/${guildId}/tickets`);
    if (status) {
      url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch tickets.');
    }

    return response.json();
  },

  // Add other ticket-related functions here later (e.g., createTicket)
};
