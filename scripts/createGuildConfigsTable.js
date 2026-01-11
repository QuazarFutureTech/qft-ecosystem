// scripts/createGuildConfigsTable.js
// Run with: node scripts/createGuildConfigsTable.js

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/qft-api-gateway/.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function createGuildConfigsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_configs (
        guild_id TEXT PRIMARY KEY,
        config JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_guild_configs_guild ON guild_configs(guild_id);
    `);
    console.log('✅ guild_configs table created or already exists.');
  } catch (err) {
    console.error('❌ Failed to create guild_configs table:', err.message);
  } finally {
    await pool.end();
  }
}

createGuildConfigsTable();
