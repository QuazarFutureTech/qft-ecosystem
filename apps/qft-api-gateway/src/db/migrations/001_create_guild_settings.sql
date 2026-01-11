-- Create guild_settings table with module_settings and index if it does not exist
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  command_prefix TEXT DEFAULT '?',
  module_settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild ON guild_settings(guild_id);
