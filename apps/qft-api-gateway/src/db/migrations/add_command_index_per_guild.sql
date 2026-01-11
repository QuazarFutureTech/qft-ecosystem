-- Migration: Add per-guild command_index to custom_commands
-- 1) Add column
ALTER TABLE custom_commands
  ADD COLUMN IF NOT EXISTS command_index INTEGER;

-- 2) Populate command_index per guild starting at 0 based on created_at order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY guild_id ORDER BY created_at ASC) - 1 AS rn
  FROM custom_commands
  WHERE guild_id IS NOT NULL
)
UPDATE custom_commands
SET command_index = ordered.rn
FROM ordered
WHERE custom_commands.id = ordered.id
  AND (custom_commands.command_index IS NULL OR custom_commands.command_index <> ordered.rn);

-- 3) Fill any remaining NULLs with 0
UPDATE custom_commands
SET command_index = 0
WHERE command_index IS NULL;

-- 4) Create unique index per guild
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_commands_guild_command_index
ON custom_commands (guild_id, command_index);

-- 5) Ensure NOT NULL if desired (only after verifying data)
ALTER TABLE custom_commands
  ALTER COLUMN command_index SET NOT NULL;

-- 6) Make command_name nullable (so commands can be identified primarily by command_index)
ALTER TABLE custom_commands
  ALTER COLUMN command_name DROP NOT NULL;

-- 7) Drop the unique constraint on (guild_id, command_name) if it exists
ALTER TABLE custom_commands
  DROP CONSTRAINT IF EXISTS custom_commands_guild_id_command_name_key;

-- 8) If there is a unique index on (guild_id, command_name), drop it to avoid conflicts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_custom_commands_guild_command_name') THEN
    EXECUTE 'DROP INDEX idx_custom_commands_guild_command_name';
  END IF;
END$$;

-- Note: Primary key `id` remains unchanged. This migration makes command_index a per-guild index starting at 0.
