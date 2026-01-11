-- create_reaction_scan_checkpoints.sql
CREATE TABLE IF NOT EXISTS reaction_scan_checkpoints (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    last_message_id TEXT,
    PRIMARY KEY (guild_id, channel_id)
);
