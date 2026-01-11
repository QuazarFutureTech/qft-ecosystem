-- Add module_settings JSONB column to guild_settings for per-guild module toggles
ALTER TABLE guild_settings
ADD COLUMN IF NOT EXISTS module_settings JSONB DEFAULT '{}'::jsonb;
