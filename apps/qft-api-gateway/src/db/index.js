// qft-api-gateway/src/db/index.js

// Import the PostgreSQL client
const { Pool } = require('pg');

// Create a connection pool using environment variables defined in .env
// This pool manages multiple connections efficiently.
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Function to set up the necessary tables (Our QFT Account Schema)
const syncDatabase = async () => {
  try {
    const client = await pool.connect();

    // Enable UUID generation (needed for the QFT UUID)
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // The core 'users' table for the QFT Identity System
    // We use Discord ID as the external unique identifier.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        -- The internal QFT identifier
        qft_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
        -- The external Discord identifier
        discord_id TEXT UNIQUE NOT NULL, 
        username TEXT NOT NULL,
        email TEXT,
        public_flags INTEGER,
        avatar TEXT,
        qft_role TEXT DEFAULT 'level_0_standard',
        -- Storing the access and refresh tokens is crucial for future operations
        discord_access_token TEXT,
        discord_refresh_token TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add public_flags column if it does not exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS public_flags INTEGER;
    `);

    // Add avatar column if it does not exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar TEXT;
    `);

    // Add qft_role column if it does not exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS qft_role TEXT DEFAULT 'level_0_standard';
    `);

    // Add connections column if it does not exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS connections JSONB;
    `);

    // The 'posts' table for the feed
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_qft_uuid UUID REFERENCES users(qft_uuid) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // The 'system_logs' table for admin monitoring
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL, -- e.g., 'INFO', 'WARN', 'ERROR'
        message TEXT NOT NULL
      );
    `);
    
    console.log('PostgreSQL database synchronized: QFT Identity Schema (users table) and posts table created/updated.');

    client.release();
  } catch (err) {
    console.error('DATABASE SYNC ERROR. Check PostgreSQL is running and credentials are correct.', err.message);
    // CRITICAL: Exit the process if the database is not available at startup
    throw new Error('Database connection failed. Check your .env credentials and server status.');
  }
};

module.exports = {
  // Simple wrapper function to run queries using the connection pool
  query: (text, params) => pool.query(text, params),
  // Export the function to run at server startup
  syncDatabase,
};