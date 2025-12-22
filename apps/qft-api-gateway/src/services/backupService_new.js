// qft-api-gateway/src/services/backupService.js
// Server backup and restore with config export/import

const { Pool } = require('pg');
const crypto = require('crypto');
const fetch = require('node-fetch');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:3002';
const INTERNAL_BOT_SECRET = process.env.INTERNAL_BOT_SECRET || 'dev_secret';

// Create a server backup
const createBackup = async (guildId, client, createdByDiscordId, isAutomated = false) => {
  // Note: 'client' param is deprecated/unused as we now call the Agent
  try {
    // 1. Request backup data from Agent
    const agentResponse = await fetch(`${AGENT_API_URL}/api/internal/backups/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'internal-secret': INTERNAL_BOT_SECRET
        },
        body: JSON.stringify({ guildId })
    });

    if (!agentResponse.ok) {
        const errorText = await agentResponse.text();
        throw new Error(`Agent failed to generate backup: ${errorText}`);
    }

    const { backup: backupData } = await agentResponse.json();

    // Calculate hash
    const configHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(backupData))
      .digest('hex');

    const query = `
      INSERT INTO server_backups (guild_id, backup_name, backup_data, config_hash, backup_size_bytes, created_by_discord_id, is_automated)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const backupName = `backup_${new Date().toISOString().split('T')[0]}_${isAutomated ? 'auto' : 'manual'}`;
    const backupSize = JSON.stringify(backupData).length;

    const result = await pool.query(query, [guildId, backupName, JSON.stringify(backupData), configHash, backupSize, createdByDiscordId, isAutomated]);

    return { success: true, backup: result.rows[0] };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return { success: false, error: error.message };
  }
};

// List backups for guild
const listBackups = async (guildId, limit = 20, offset = 0) => {
  const query = `
    SELECT id, backup_name, config_hash, backup_size_bytes, created_at, is_automated, created_by_discord_id
    FROM server_backups
    WHERE guild_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const result = await pool.query(query, [guildId, limit, offset]);
  return result.rows;
};

// Get backup by ID
const getBackup = async (backupId) => {
  const query = `
    SELECT * FROM server_backups WHERE id = $1;
  `;
  const result = await pool.query(query, [backupId]);
  return result.rows[0] || null;
};

// Restore backup
const restoreBackup = async (backupId) => {
    try {
        const backup = await getBackup(backupId);
        if (!backup) throw new Error('Backup not found');

        const agentResponse = await fetch(`${AGENT_API_URL}/api/internal/backups/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'internal-secret': INTERNAL_BOT_SECRET
            },
            body: JSON.stringify({ 
                guildId: backup.guild_id,
                backupData: backup.backup_data 
            })
        });

        if (!agentResponse.ok) {
            throw new Error('Agent failed to restore backup');
        }

        return await agentResponse.json();
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = {
    createBackup,
    listBackups,
    getBackup,
    restoreBackup
};
