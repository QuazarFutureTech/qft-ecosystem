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
const listEmbedTemplates = async (guildId) => {
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
const getEmbedTemplate = async (guildId, templateId) => {
  const query = `
    SELECT id, guild_id, template_name, embed_data, author_discord_id, created_at, updated_at
    FROM embed_templates
    WHERE id = $1 AND guild_id = $2;
  `;
  const result = await db.query(query, [templateId, guildId]);
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    ...row,
    embed_data: typeof row.embed_data === 'string' ? JSON.parse(row.embed_data) : row.embed_data
  };
};

// Update an existing embed template
const updateEmbedTemplate = async (guildId, templateId, name, embedData, updaterDiscordId) => {
  const query = `
    UPDATE embed_templates
    SET template_name = $3, embed_data = $4, updated_at = CURRENT_TIMESTAMP, author_discord_id = $5
    WHERE id = $2 AND guild_id = $1
    RETURNING *;
  `;
  const result = await db.query(query, [guildId, templateId, name, JSON.stringify(embedData), updaterDiscordId]);
  return result.rows[0];
};

// Delete a template
const deleteEmbedTemplate = async (guildId, templateId) => {
  const query = `
    DELETE FROM embed_templates
    WHERE id = $1 AND guild_id = $2
    RETURNING id;
  `;
  const result = await db.query(query, [templateId, guildId]);
  return result.rows.length > 0;
};

module.exports = {
  createEmbedTemplate: saveTemplate, // Renaming for clarity if needed, keep saveTemplate as internal
  listEmbedTemplates,
  getEmbedTemplate,
  updateEmbedTemplate,
  deleteEmbedTemplate
};
