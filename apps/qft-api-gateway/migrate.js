// migrate.js
// Run all SQL migrations in the migrations folder using the existing Postgres connection

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
// Load environment from the app-local .env to avoid CWD issues when running from repo root
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  // Ensure password is a string to satisfy pg client requirements
  password: typeof process.env.PGPASSWORD === 'string' ? process.env.PGPASSWORD : String(process.env.PGPASSWORD || ''),
  port: process.env.PGPORT,
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`Success: ${file}`);
    } catch (e) {
      console.error(`Error running migration ${file}:`, e.message);
    }
  }
  await pool.end();
  console.log('All migrations complete.');
}

runMigrations();
