-- Create scheduled_commands table for delayed command execution
CREATE TABLE IF NOT EXISTS scheduled_commands (
  id SERIAL PRIMARY KEY,
  guild_id VARCHAR(255) NOT NULL,
  command_name VARCHAR(255),
  command_code TEXT NOT NULL,
  channel_id VARCHAR(255),
  user_id VARCHAR(255),
  scheduled_time TIMESTAMP NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMP,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON scheduled_commands(scheduled_time, executed) WHERE NOT executed;
CREATE INDEX IF NOT EXISTS idx_scheduled_guild ON scheduled_commands(guild_id);
