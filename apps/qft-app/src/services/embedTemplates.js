// qft-app/src/services/embedTemplates.js
// API calls for embed template management

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const saveEmbedTemplate = async (guildId, templateName, embedData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guilds/${guildId}/embed-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ templateName, embedData })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving embed template:', error);
    return { success: false, error: error.message };
  }
};

export const getEmbedTemplates = async (guildId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/guilds/${guildId}/embed-templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch templates');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching embed templates:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

export const deleteEmbedTemplate = async (templateId, guildId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/embed-templates/${templateId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ guildId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete template');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting embed template:', error);
    return { success: false, error: error.message };
  }
};
