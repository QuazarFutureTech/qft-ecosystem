// Migration: Create guild_modules table for per-guild module enable/disable state

module.exports = {
  up: async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guild_modules (
        guild_id TEXT NOT NULL,
        module_key TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, module_key)
      );
    `);
  },
  down: async (db) => {
    await db.query('DROP TABLE IF EXISTS guild_modules;');
  }
};
