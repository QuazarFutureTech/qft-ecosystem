// scripts/normalizeCustomCommandNames.js
// Run this script to normalize all custom command triggers in the DB (strip prefix, force lowercase)

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/qft-api-gateway/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
});

async function normalizeTriggers() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, command_name FROM custom_commands WHERE is_active = true');
    for (const row of res.rows) {
      let normalized = row.command_name.trim().replace(/^[!\/.]+/, '').toLowerCase();
      if (normalized !== row.command_name) {
        await client.query('UPDATE custom_commands SET command_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [normalized, row.id]);
        console.log(`Normalized command id ${row.id}: '${row.command_name}' -> '${normalized}'`);
      }
    }
    console.log('Normalization complete.');
  } catch (err) {
    console.error('Error normalizing command names:', err);
  } finally {
    client.release();
    pool.end();
  }
}

normalizeTriggers();
