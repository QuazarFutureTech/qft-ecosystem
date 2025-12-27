// apps/qft-api-gateway/src/routes/database.js
const express = require('express');
const router = express.Router();
const databaseService = require('../services/databaseService');
const { rbacMiddleware } = require('../middleware/rbacMiddleware');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// Get all tables with row counts
router.get('/tables', rbacMiddleware('admin'), async (req, res) => {
  try {
    const tables = await databaseService.getAllTables();
    res.json({ success: true, tables });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get database statistics
router.get('/stats', rbacMiddleware('admin'), async (req, res) => {
  try {
    const stats = await databaseService.getDatabaseStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table schema
router.get('/tables/:tableName/schema', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const schema = await databaseService.getTableSchema(tableName);
    res.json({ success: true, schema });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table data with pagination
router.get('/tables/:tableName/data', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const data = await databaseService.getTableData(tableName, limit, offset);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup table data
router.post('/tables/:tableName/backup', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const backup = await databaseService.backupTable(tableName);
    res.json({ success: true, backup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a single row from table
router.delete('/tables/:tableName/rows', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { primaryKeyColumn, primaryKeyValue } = req.body;
    
    if (!primaryKeyColumn || primaryKeyValue === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: primaryKeyColumn, primaryKeyValue'
      });
    }

    const result = await databaseService.deleteRow(tableName, primaryKeyColumn, primaryKeyValue);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Truncate table (delete all rows)
router.delete('/tables/:tableName', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const { confirmationCode } = req.body;
    
    if (confirmationCode !== `TRUNCATE_${tableName.toUpperCase()}`) {
      return res.status(400).json({ 
        error: 'Invalid confirmation code',
        required: `TRUNCATE_${tableName.toUpperCase()}`
      });
    }

    const result = await databaseService.truncateTable(tableName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purge entire database
router.post('/purge', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { confirmationCode } = req.body;
    const result = await databaseService.purgeDatabase(confirmationCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute custom SQL query (SELECT only)
router.post('/query', rbacMiddleware('admin'), async (req, res) => {
  try {
    const { query } = req.body;
    const result = await databaseService.executeQuery(query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
