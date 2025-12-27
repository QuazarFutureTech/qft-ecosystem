// apps/qft-api-gateway/src/routes/modules.js
const express = require('express');
const router = express.Router();

const moduleService = require('../services/moduleService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

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
