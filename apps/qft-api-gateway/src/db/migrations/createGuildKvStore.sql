-- Migration script for per-guild key-value store
drop table if exists guild_kv_store;
create table if not exists guild_kv_store (
    id serial primary key,
    guild_id varchar(32) not null,
    key varchar(128) not null,
    value text,
    updated_at timestamptz default now(),
    unique (guild_id, key)
);

-- Index for fast lookup
create index if not exists idx_guild_kv_store_guild_key on guild_kv_store (guild_id, key);