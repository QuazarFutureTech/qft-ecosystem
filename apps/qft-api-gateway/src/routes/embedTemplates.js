// apps/qft-api-gateway/src/routes/embedTemplates.js
const express = require('express');
const router = express.Router();
const embedTemplateService = require('../services/embedTemplateService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// List all embed templates for a guild
router.get('/guilds/:guildId/embed-templates', rbacMiddleware('user'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const templates = await embedTemplateService.listEmbedTemplates(guildId);
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new embed template for a guild
router.post('/guilds/:guildId/embed-templates', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { name, embedData } = req.body;
    const authorDiscordId = req.user?.discord_id;

    if (!name || !embedData) {
      return res.status(400).json({ success: false, error: 'Name and embedData are required.' });
    }

    const template = await embedTemplateService.createEmbedTemplate(guildId, name, embedData, authorDiscordId);
    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific embed template by ID
router.get('/guilds/:guildId/embed-templates/:templateId', rbacMiddleware('user'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const template = await embedTemplateService.getEmbedTemplate(guildId, templateId);
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Embed template not found.' });
    }
    
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update an existing embed template by ID
router.put('/guilds/:guildId/embed-templates/:templateId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const { name, embedData } = req.body;
    const updaterDiscordId = req.user?.discord_id;

    const template = await embedTemplateService.updateEmbedTemplate(guildId, templateId, name, embedData, updaterDiscordId);
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Embed template not found.' });
    }
    
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete an embed template by ID
router.delete('/guilds/:guildId/embed-templates/:templateId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const deleted = await embedTemplateService.deleteEmbedTemplate(guildId, templateId);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Embed template not found.' });
    }
    
    res.json({ success: true, message: 'Embed template deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
