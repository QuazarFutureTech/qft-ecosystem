// dbGuildKvService.js
// Service for per-guild key-value store (guild_kv_store)

const db = require('../db');

const TABLE = 'guild_kv_store';

module.exports = {
  async set(guildId, key, value) {
    const q = `insert into ${TABLE} (guild_id, key, value, updated_at)
      values ($1, $2, $3, now())
      on conflict (guild_id, key) do update set value = $3, updated_at = now()
      returning *;`;
    const { rows } = await db.query(q, [guildId, key, value]);
    return rows[0];
  },
  async get(guildId, key) {
    const q = `select * from ${TABLE} where guild_id = $1 and key = $2 limit 1;`;
    const { rows } = await db.query(q, [guildId, key]);
    return rows[0] || null;
  },
  async del(guildId, key) {
    const q = `delete from ${TABLE} where guild_id = $1 and key = $2 returning *;`;
    const { rows } = await db.query(q, [guildId, key]);
    return rows[0] || null;
  },
  async incr(guildId, key, by = 1) {
    const q = `insert into ${TABLE} (guild_id, key, value, updated_at)
      values ($1, $2, $3, now())
      on conflict (guild_id, key) do update set value = (guild_kv_store.value::bigint + $3)::text, updated_at = now()
      returning *;`;
    const { rows } = await db.query(q, [guildId, key, String(by)]);
    return rows[0];
  },
  async topEntries(guildId, limit = 10) {
    const q = `select * from ${TABLE} where guild_id = $1 order by updated_at desc limit $2;`;
    const { rows } = await db.query(q, [guildId, limit]);
    return rows;
  }
};
