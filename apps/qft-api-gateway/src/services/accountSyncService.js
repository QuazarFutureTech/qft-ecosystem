// qft-api-gateway/src/services/accountSyncService.js
// Account synchronization service for syncing Discord users with website database

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Role mapping: Discord role IDs/names to website roles
const ROLE_MAPPINGS = {
  'admin': 'admin',
  'staff': 'staff',
  'moderator': 'staff',
  'mod': 'staff',
  'default': 'user'
};

const mapDiscordRolesToWebsiteRole = (discordRoles) => {
  for (const role of discordRoles) {
    const roleName = role.name.toLowerCase();
    if (ROLE_MAPPINGS[roleName]) {
      return ROLE_MAPPINGS[roleName];
    }
  }
  return 'user';
};

// Sync Discord members to database
const syncAccounts = async (guildId, members) => {
  console.log(`[AccountSyncService] Starting sync for guild ${guildId} with ${members?.length || 0} members`);
  
  if (!members || !Array.isArray(members)) {
    throw new Error('Invalid members data: expected array');
  }
  
  let syncedCount = 0;
  let newUsersCount = 0;
  
  for (const member of members) {
    try {
      if (!member.userId || !member.username) {
        console.warn(`[AccountSyncService] Skipping invalid member:`, member);
        continue;
      }
      
      // Skip bot accounts
      if (member.bot === true || member.isBot === true) {
        console.log(`[AccountSyncService] Skipping bot: ${member.username} (${member.userId})`);
        continue;
      }
      
      const websiteRole = mapDiscordRolesToWebsiteRole(member.roles || []);
      const discordRoleNames = (member.roles || []).map(r => r.name);
      
      console.log(`[AccountSyncService] Syncing user ${member.username} (${member.userId})`);
      
      // First, sync to synced_accounts table (for tracking)
      const syncQuery = `
        INSERT INTO synced_accounts (
          guild_id, 
          discord_user_id, 
          username, 
          discriminator,
          discord_roles, 
          website_role,
          last_synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (guild_id, discord_user_id) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          discriminator = EXCLUDED.discriminator,
          discord_roles = EXCLUDED.discord_roles,
          website_role = EXCLUDED.website_role,
          last_synced_at = NOW()
        RETURNING *;
      `;
      
      await pool.query(syncQuery, [
        guildId,
        member.userId,
        member.username,
        member.discriminator || '0',
        JSON.stringify(discordRoleNames),
        websiteRole
      ]);
      
      // Now sync to main users table for permission system
      const userQuery = `
        INSERT INTO users (
          discord_id,
          username,
          qft_role,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (discord_id) 
        DO UPDATE SET 
          username = EXCLUDED.username,
          updated_at = NOW()
        RETURNING qft_uuid, (xmax = 0) AS inserted;
      `;
      
      const userResult = await pool.query(userQuery, [
        member.userId,
        member.username,
        null // Don't override existing qft_role
      ]);
      
      if (userResult.rows[0]?.inserted) {
        newUsersCount++;
        console.log(`[AccountSyncService] Created new user: ${member.username} (${member.userId})`);
      }
      
      syncedCount++;
    } catch (error) {
      console.error(`[AccountSyncService] Failed to sync account ${member.userId}:`, error);
    }
  }
  
  console.log(`[AccountSyncService] Successfully synced ${syncedCount} accounts (${newUsersCount} new users)`);
  
  // Update last sync time for guild
  await pool.query(
    'INSERT INTO guild_sync_metadata (guild_id, last_sync_time) VALUES ($1, NOW()) ON CONFLICT (guild_id) DO UPDATE SET last_sync_time = NOW()',
    [guildId]
  );
  
  return { syncedCount, newUsersCount };
};

// Get synced accounts for a guild
const getSyncedAccounts = async (guildId) => {
  const query = `
    SELECT 
      id,
      discord_user_id,
      username,
      discriminator,
      discord_roles,
      website_role,
      staff_profile_id,
      last_synced_at
    FROM synced_accounts
    WHERE guild_id = $1
    ORDER BY username ASC;
  `;
  
  const result = await pool.query(query, [guildId]);
  return result.rows;
};

// Get last sync time for guild
const getLastSyncTime = async (guildId) => {
  const query = `
    SELECT last_sync_time FROM guild_sync_metadata WHERE guild_id = $1;
  `;
  
  const result = await pool.query(query, [guildId]);
  return result.rows[0]?.last_sync_time || null;
};

// Update account role
const updateAccountRole = async (accountId, role) => {
  const query = `
    UPDATE synced_accounts 
    SET website_role = $1 
    WHERE id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [role, accountId]);
  return result.rows[0];
};

// Link account to staff profile
const linkAccountToStaff = async (accountId, staffProfileId) => {
  const query = `
    UPDATE synced_accounts 
    SET staff_profile_id = $1 
    WHERE id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [staffProfileId, accountId]);
  return result.rows[0];
};

// Get account by Discord user ID
const getAccountByDiscordId = async (guildId, discordUserId) => {
  const query = `
    SELECT * FROM synced_accounts 
    WHERE guild_id = $1 AND discord_user_id = $2;
  `;
  
  const result = await pool.query(query, [guildId, discordUserId]);
  return result.rows[0] || null;
};

module.exports = {
  syncAccounts,
  getSyncedAccounts,
  getLastSyncTime,
  updateAccountRole,
  linkAccountToStaff,
  getAccountByDiscordId
};
