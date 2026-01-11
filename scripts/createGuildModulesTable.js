// scripts/createGuildModulesTable.js
// Run with: node scripts/createGuildModulesTable.js

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../apps/qft-api-gateway/.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function createGuildModulesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guild_modules (
        guild_id TEXT NOT NULL,
        module_key TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, module_key)
      );
    `);
    console.log('✅ guild_modules table created or already exists.');
  } catch (err) {
    console.error('❌ Failed to create guild_modules table:', err.message);
  } finally {
    await pool.end();
  }
}

createGuildModulesTable();
