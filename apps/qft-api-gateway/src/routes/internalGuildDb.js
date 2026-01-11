// internalGuildDb.js
// Internal API routes for per-guild key-value DB

const express = require('express');
const router = express.Router();
const dbGuildKv = require('../services/dbGuildKvService');

// All routes require internal secret (handled by parent router)

// Set value
router.post('/guilddb/set', async (req, res) => {
  try {
    const { guildId, key, value } = req.body;
    const result = await dbGuildKv.set(guildId, key, value);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get value
router.get('/guilddb/get', async (req, res) => {
  try {
    const { guildId, key } = req.query;
    const result = await dbGuildKv.get(guildId, key);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete value
router.delete('/guilddb/del', async (req, res) => {
  try {
    const { guildId, key } = req.body;
    const result = await dbGuildKv.del(guildId, key);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Increment value
router.post('/guilddb/incr', async (req, res) => {
  try {
    const { guildId, key, by } = req.body;
    const result = await dbGuildKv.incr(guildId, key, by);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Top entries
router.get('/guilddb/top', async (req, res) => {
  try {
    const { guildId, limit } = req.query;
    const result = await dbGuildKv.topEntries(guildId, limit);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
