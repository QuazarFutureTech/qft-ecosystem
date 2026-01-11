// apps/qft-api-gateway/src/routes/guildConfig.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');


const db = require('../db');

// GET guild config

router.get('/guilds/:guildId/config', authenticateToken, async (req, res) => {
  const { guildId } = req.params;
  try {
    const result = await db.query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
    let config, updatedAt;
    if (result.rows.length === 0) {
      // No config exists, create a default config with categories
      config = {
        categories: {
          commands: true,
          automod: true
        }
      };
      await db.query(
        `INSERT INTO guild_configs (guild_id, config, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id) DO UPDATE SET config = $2, updated_at = NOW()`,
        [guildId, JSON.stringify(config)]
      );
      updatedAt = new Date();
    } else {
      const row = result.rows[0];
      config = row.config || {};
      updatedAt = row.updated_at;
      // If categories missing, add it and upsert
      if (!config.categories || typeof config.categories !== 'object') {
        config.categories = {
          commands: true,
          automod: true
        };
        await db.query(
          `UPDATE guild_configs SET config = $2, updated_at = NOW() WHERE guild_id = $1`,
          [guildId, JSON.stringify(config)]
        );
      }
    }
    res.json({ guildId, settings: config, updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config', details: err.message });
  }
});

// PUT guild config


router.put('/guilds/:guildId/config', authenticateToken, async (req, res) => {
  const { guildId } = req.params;
  const config = req.body;
  try {
    // Debug: print config being saved
    console.log('[guildConfig] Saving config for', guildId, JSON.stringify(config));
    // Upsert config
    const result = await db.query(
      `INSERT INTO guild_configs (guild_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET config = $2, updated_at = NOW()
       RETURNING *`,
      [guildId, JSON.stringify(config)]
    );
    res.json({ success: true, config: result.rows[0] });
  } catch (err) {
    // Log full error and config
    console.error('[guildConfig] Failed to save config for', guildId, err, '\nConfig:', config);
    res.status(500).json({ error: 'Failed to save config', details: err.message });
  }
});

module.exports = router;
