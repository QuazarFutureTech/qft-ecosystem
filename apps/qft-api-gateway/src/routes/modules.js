
// apps/qft-api-gateway/src/routes/modules.js
const express = require('express');
const router = express.Router();
const moduleService = require('../services/moduleService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// Get all modules and their enabled state for a guild
router.get('/guilds/:guildId/modules', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const modules = await moduleService.getGuildModules(guildId);
    res.json({ success: true, modules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set enabled state for a module in a guild
router.put('/guilds/:guildId/modules/:moduleKey/enable', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { guildId, moduleKey } = req.params;
    const { enabled } = req.body;
    console.log('[TOGGLE] Endpoint hit', { guildId, moduleKey, enabled });
    if (typeof enabled !== 'boolean') {
      console.log('[TOGGLE] Invalid enabled value:', enabled);
      return res.status(400).json({ error: 'enabled must be boolean' });
    }
    let result;
    try {
      result = await moduleService.setGuildModuleEnabled(guildId, moduleKey, enabled);
      console.log('[TOGGLE] setGuildModuleEnabled result:', result);
    } catch (err) {
      console.error('[TOGGLE] Error in setGuildModuleEnabled:', err);
      return res.status(500).json({ error: 'Failed to update module enabled state', details: err.message });
    }

    // Also update the categories object in the config
    let configRes, config;
    try {
      configRes = await req.app.get('db').query('SELECT config FROM guild_configs WHERE guild_id = $1', [guildId]);
      config = (configRes.rows[0] && configRes.rows[0].config) || {};
      console.log('[TOGGLE] Loaded config:', config);
    } catch (err) {
      console.error('[TOGGLE] Error loading config:', err);
      return res.status(500).json({ error: 'Failed to load config', details: err.message });
    }
    if (!config.categories || typeof config.categories !== 'object') config.categories = {};
    config.categories[moduleKey] = enabled;
    console.log(`[TOGGLE] Updating config.categories for guild ${guildId}:`, JSON.stringify(config.categories));
    try {
      await req.app.get('db').query(
        `INSERT INTO guild_configs (guild_id, config, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id) DO UPDATE SET config = $2, updated_at = NOW()`,
        [guildId, JSON.stringify(config)]
      );
      // Confirm update
      const confirmRes = await req.app.get('db').query('SELECT config FROM guild_configs WHERE guild_id = $1', [guildId]);
      console.log(`[TOGGLE] Confirmed config.categories for guild ${guildId}:`, JSON.stringify(confirmRes.rows[0]?.config?.categories));
    } catch (err) {
      console.error('[TOGGLE] Error updating config:', err);
      return res.status(500).json({ error: 'Failed to update config', details: err.message });
    }

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pages with categories and modules
router.get('/pages', rbacMiddleware('admin'), async (req, res) => {
  try {
    const pages = await moduleService.getAllPages();
    res.json({ success: true, pages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific page by key
router.get('/pages/:pageKey', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageKey } = req.params;
    const page = await moduleService.getPageByKey(pageKey);
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new page
router.post('/pages', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageKey, name, description, icon, displayOrder } = req.body;
    const page = await moduleService.createPage(pageKey, name, description, icon, displayOrder);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a page
router.patch('/pages/:pageId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId } = req.params;
    const updates = req.body;
    const page = await moduleService.updatePage(pageId, updates);
    res.json({ success: true, page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a page
router.delete('/pages/:pageId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId } = req.params;
    const deleted = await moduleService.deletePage(pageId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a category
router.post('/categories', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { pageId, categoryKey, name, description, displayOrder } = req.body;
    const category = await moduleService.createCategory(pageId, categoryKey, name, description, displayOrder);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category
router.patch('/categories/:categoryId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;
    const category = await moduleService.updateCategory(categoryId, updates);
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a category
router.delete('/categories/:categoryId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const deleted = await moduleService.deleteCategory(categoryId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a module
router.post('/', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { 
      categoryId, 
      moduleKey, 
      name, 
      componentName, 
      description, 
      icon, 
      displayOrder, 
      requiredClearance, 
      configuration 
    } = req.body;
    
    const module = await moduleService.createModule(
      categoryId, 
      moduleKey, 
      name, 
      componentName, 
      description, 
      icon, 
      displayOrder, 
      requiredClearance, 
      configuration
    );
    
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a module
router.patch('/:moduleId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const updates = req.body;
    const module = await moduleService.updateModule(moduleId, updates);
    res.json({ success: true, module });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a module
router.delete('/:moduleId', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const deleted = await moduleService.deleteModule(moduleId);
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update module orders (for drag-and-drop reordering)
router.post('/reorder', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { updates } = req.body; // Array of { module_id, display_order }
    const result = await moduleService.updateModuleOrders(updates);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update category orders
router.post('/categories/reorder', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { updates } = req.body; // Array of { category_id, display_order }
    const result = await moduleService.updateCategoryOrders(updates);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default module structure
router.post('/initialize', rbacMiddleware('admin'), async (req, res) => {
  try {
    const result = await moduleService.initializeDefaultModules();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
