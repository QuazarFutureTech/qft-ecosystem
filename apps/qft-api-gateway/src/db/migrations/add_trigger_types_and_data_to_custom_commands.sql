-- Migration: Add triggerData and expand triggerType for custom_commands
ALTER TABLE custom_commands
ADD COLUMN IF NOT EXISTS trigger_data JSONB DEFAULT '{}'::jsonb;

-- Optionally, update trigger_type to allow more values (if using enum, adjust accordingly)
-- If trigger_type is VARCHAR, no change needed. If enum, run:
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'regex';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'contains';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'exact';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'reaction';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'user_join';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'user_leave';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'scheduled';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'button';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'voice';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'role_change';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'message_edit';
-- ALTER TYPE trigger_type_enum ADD VALUE IF NOT EXISTS 'message_delete';

-- If you want to enforce allowed values, consider a CHECK constraint or enum type.
