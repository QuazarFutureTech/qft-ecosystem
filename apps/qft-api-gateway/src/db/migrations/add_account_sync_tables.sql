-- Migration: Add synced_accounts and guild_sync_metadata tables
-- Purpose: Support Discord account syncing and role mapping

-- Table for synced Discord accounts
CREATE TABLE IF NOT EXISTS synced_accounts (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    discord_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(10) DEFAULT '0',
    discord_roles JSONB DEFAULT '[]',
    website_role VARCHAR(50) DEFAULT 'user',
    staff_profile_id INTEGER REFERENCES staff_profiles(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, discord_user_id)
);

CREATE INDEX idx_synced_accounts_guild ON synced_accounts(guild_id);
CREATE INDEX idx_synced_accounts_discord_user ON synced_accounts(discord_user_id);
CREATE INDEX idx_synced_accounts_staff_profile ON synced_accounts(staff_profile_id);

-- Table for guild sync metadata
CREATE TABLE IF NOT EXISTS guild_sync_metadata (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) UNIQUE NOT NULL,
    last_sync_time TIMESTAMP DEFAULT NOW(),
    sync_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guild_sync_metadata_guild ON guild_sync_metadata(guild_id);

-- Add comments
COMMENT ON TABLE synced_accounts IS 'Stores synced Discord accounts with role mappings';
COMMENT ON TABLE guild_sync_metadata IS 'Tracks last sync time for each guild';

-- Add lifecycle_state to workers table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workers' 
        AND column_name = 'lifecycle_state'
    ) THEN
        ALTER TABLE workers 
        ADD COLUMN lifecycle_state VARCHAR(50) DEFAULT 'active',
        ADD COLUMN execution_count INTEGER DEFAULT 0,
        ADD COLUMN last_executed_at TIMESTAMP;
        
        CREATE INDEX idx_workers_lifecycle ON workers(lifecycle_state);
    END IF;
END $$;
