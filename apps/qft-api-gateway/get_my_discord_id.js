// Quick script to get your Discord ID from the database
// Run this with: node get_my_discord_id.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

async function getMyDiscordId() {
  try {
    const result = await pool.query('SELECT discord_id, username, email, qft_role FROM users ORDER BY created_at DESC LIMIT 10');
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log('\n📋 Recent Users in Database:\n');
    console.log('═══════════════════════════════════════════════════════════════');
    
    result.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. Username: ${user.username}`);
      console.log(`   Discord ID: ${user.discord_id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   QFT Role: ${user.qft_role || 'N/A'}`);
      console.log('   ───────────────────────────────────────────────────────');
    });

    console.log('\n\n🔥 TO ADD MASTER ADMIN ACCESS:\n');
    console.log('1. Copy your Discord ID from above');
    console.log('2. Add this to your .env file:\n');
    console.log('   MASTER_ADMIN_IDS=YOUR_DISCORD_ID_HERE\n');
    console.log('3. Or for multiple admins:');
    console.log('   MASTER_ADMIN_IDS=123456789,987654321,111222333\n');
    console.log('4. Restart the API Gateway\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getMyDiscordId();
