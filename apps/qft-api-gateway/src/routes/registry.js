// Registry Routes - Key-Value pair management for channels, roles, users, servers
const express = require('express');
const router = express.Router();
const registryService = require('../services/registryService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const { activityLogger } = require('../middleware/activityLogger');

// Get all registry entries (with optional type filter)
router.get('/', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { type, search } = req.query;
    
    let entries;
    if (search) {
      entries = await registryService.searchRegistry(search);
    } else if (type) {
      entries = await registryService.getRegistryByType(type);
    } else {
      entries = await registryService.getAllRegistryEntries();
    }
    
    res.json({ success: true, entries });
  } catch (error) {
    console.error('Error fetching registry entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific registry entry by key
router.get('/key/:key', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { type } = req.query;
    
    const entry = await registryService.getRegistryEntry(key, type);
    
    if (!entry) {
      return res.status(404).json({ error: 'Registry entry not found' });
    }
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error fetching registry entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new registry entry
router.post(
  '/',
  rbacMiddleware('admin'),
  activityLogger('create_registry_entry', 'registry'),
  async (req, res) => {
    try {
      const { type, key, value, description, metadata } = req.body;
      
      if (!type || !key || !value) {
        return res.status(400).json({ error: 'Type, key, and value are required' });
      }
      
      const entry = await registryService.createRegistryEntry(type, key, value, description, metadata);
      res.json({ success: true, entry });
    } catch (error) {
      console.error('Error creating registry entry:', error);
      
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Registry entry with this type and key already exists' });
      }
      
      res.status(500).json({ error: error.message });
    }
  }
);

// Update registry entry
router.patch(
  '/:id',
  rbacMiddleware('admin'),
  activityLogger('update_registry_entry', 'registry'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const entry = await registryService.updateRegistryEntry(id, updates);
      
      if (!entry) {
        return res.status(404).json({ error: 'Registry entry not found' });
      }
      
      res.json({ success: true, entry });
    } catch (error) {
      console.error('Error updating registry entry:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete registry entry
router.delete(
  '/:id',
  rbacMiddleware('admin'),
  activityLogger('delete_registry_entry', 'registry'),
  async (req, res) => {
    try {
      const { id } = req.params;
      await registryService.deleteRegistryEntry(id);
      res.json({ success: true, message: 'Registry entry deleted' });
    } catch (error) {
      console.error('Error deleting registry entry:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
