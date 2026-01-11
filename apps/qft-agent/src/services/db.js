// db.js
// Simple Postgres connection for qft-agent (for checkpointing)
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../qft-api-gateway/.env') });

const pool = new Pool({
  user: String(process.env.PGUSER || process.env.DB_USER || ''),
  host: String(process.env.PGHOST || process.env.DB_HOST || 'localhost'),
  database: String(process.env.PGDATABASE || process.env.DB_NAME || ''),
  password: String(process.env.PGPASSWORD || process.env.DB_PASSWORD || ''),
  port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
});

module.exports = pool;
