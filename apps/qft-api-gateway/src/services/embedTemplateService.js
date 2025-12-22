// qft-api-gateway/src/services/embedTemplateService.js
// Service for managing Discord embed templates

const db = require('../db'); // Use shared database connection

// Create a new embed template
const saveTemplate = async (guildId, templateName, embedData, authorDiscordId) => {
  const query = `
    INSERT INTO embed_templates (guild_id, template_name, embed_data, author_discord_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (guild_id, template_name)
    DO UPDATE SET 
      embed_data = $3,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, templateName, JSON.stringify(embedData), authorDiscordId]);
  return result.rows[0];
};

// Get all templates for a guild
const getTemplates = async (guildId) => {
  const query = `
    SELECT id, template_name, embed_data, author_discord_id, created_at, updated_at
    FROM embed_templates
    WHERE guild_id = $1
    ORDER BY updated_at DESC;
  `;
  const result = await db.query(query, [guildId]);
  return result.rows.map(row => ({
    ...row,
    embed_data: typeof row.embed_data === 'string' ? JSON.parse(row.embed_data) : row.embed_data
  }));
};

// Get a specific template by ID
const getTemplateById = async (templateId) => {
  const query = `
    SELECT id, guild_id, template_name, embed_data, author_discord_id, created_at, updated_at
    FROM embed_templates
    WHERE id = $1;
  `;
  const result = await db.query(query, [templateId]);
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    ...row,
    embed_data: typeof row.embed_data === 'string' ? JSON.parse(row.embed_data) : row.embed_data
  };
};

// Delete a template
const deleteTemplate = async (templateId, guildId) => {
  const query = `
    DELETE FROM embed_templates
    WHERE id = $1 AND guild_id = $2
    RETURNING id;
  `;
  const result = await db.query(query, [templateId, guildId]);
  return result.rows.length > 0;
};

module.exports = {
  saveTemplate,
  getTemplates,
  getTemplateById,
  deleteTemplate
};
