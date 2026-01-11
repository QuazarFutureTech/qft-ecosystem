// scripts/removeDuplicateCustomCommands.js
// This script finds and removes duplicate custom commands (same guild_id + normalized trigger)
// Keeps the most recently updated (by updated_at) and deletes the rest

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/qft-api-gateway/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function removeDuplicates() {
  const client = await pool.connect();
  try {
    // Get all active commands
    const res = await client.query('SELECT id, guild_id, command_name, updated_at FROM custom_commands WHERE is_active = true');
    // Group by guild_id + normalized command_name
    const map = new Map();
    for (const row of res.rows) {
      const norm = row.command_name.trim().replace(/^[!\/.]+/, '').toLowerCase();
      const key = `${row.guild_id}::${norm}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    let deleted = 0;
    for (const [key, cmds] of map.entries()) {
      if (cmds.length > 1) {
        // Sort by updated_at DESC, keep the first
        cmds.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        const toDelete = cmds.slice(1);
        for (const cmd of toDelete) {
          await client.query('UPDATE custom_commands SET is_active = false WHERE id = $1', [cmd.id]);
          console.log(`Deactivated duplicate command id ${cmd.id} for key ${key}`);
          deleted++;
        }
      }
    }
    console.log(`Removed ${deleted} duplicate commands.`);
  } catch (err) {
    console.error('Error removing duplicates:', err);
  } finally {
    client.release();
    pool.end();
  }
}

removeDuplicates();
