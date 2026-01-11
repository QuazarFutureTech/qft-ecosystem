// scripts/dbTableUtils.js
// Utility functions for table management and row-level operations
// Usage: node scripts/dbTableUtils.js <command> <table> [key] [value]

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function dbTableGet(table) {
  try {
    const res = await pool.query(`SELECT * FROM information_schema.tables WHERE table_name = $1`, [table]);
    if (res.rows.length > 0) {
      console.log(`✅ Table '${table}' exists.`);
    } else {
      console.log(`❌ Table '${table}' does not exist.`);
    }
  } catch (err) {
    console.error('Error checking table:', err.message);
  }
}

async function dbTableSet(table, createSQL) {
  try {
    await pool.query(createSQL);
    console.log(`✅ Table '${table}' created or already exists.`);
  } catch (err) {
    console.error('Error creating table:', err.message);
  }
}

async function dbTableDel(table) {
  try {
    await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
    console.log(`✅ Table '${table}' deleted.`);
  } catch (err) {
    console.error('Error deleting table:', err.message);
  }
}

// Subtable (row-level) functions for JSONB tables like guild_configs
dbSubGet = async (table, key) => {
  try {
    const res = await pool.query(`SELECT config FROM "${table}" WHERE guild_id = $1`, [key]);
    if (res.rows.length > 0) {
      console.log(res.rows[0].config);
    } else {
      console.log(`No entry for key '${key}' in table '${table}'.`);
    }
  } catch (err) {
    console.error('Error getting subtable value:', err.message);
  }
};

dbSubSet = async (table, key, value) => {
  try {
    await pool.query(
      `UPDATE "${table}" SET config = $2, updated_at = NOW() WHERE guild_id = $1`,
      [key, value]
    );
    console.log(`✅ Updated config for key '${key}' in table '${table}'.`);
  } catch (err) {
    console.error('Error setting subtable value:', err.message);
  }
};

dbSubDel = async (table, key) => {
  try {
    await pool.query(`DELETE FROM "${table}" WHERE guild_id = $1`, [key]);
    console.log(`✅ Deleted entry for key '${key}' in table '${table}'.`);
  } catch (err) {
    console.error('Error deleting subtable value:', err.message);
  }
};
