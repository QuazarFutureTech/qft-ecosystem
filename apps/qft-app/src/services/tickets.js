const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchTickets({ guildId, page=1, perPage=10, q='', status=null } = {}){
  const token = localStorage.getItem('qft-token');
  if (!token) return { success: false, error: 'No token' };

  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', perPage);
    params.append('offset', (page - 1) * perPage);
    
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/tickets?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    
    return { 
      success: true, 
      data: data.tickets || [], 
      meta: { 
        page, 
        perPage, 
        total: (data.tickets?.length || 0) + ((page-1)*perPage) 
      } 
    };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createTicket(guildId, { title, description, ticketChannelId }) {
  const token = localStorage.getItem('qft-token');
  if (!token) return { success: false, error: 'No token' };

  try {
    const res = await fetch(`${API_URL}/api/v1/guilds/${guildId}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, ticketChannelId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API Error: ${res.status}`);
    }

    const data = await res.json();
    return { success: true, data: data.ticket };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { success: false, error: error.message };
  }
}
