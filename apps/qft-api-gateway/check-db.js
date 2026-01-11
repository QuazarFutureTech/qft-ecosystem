require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function test() {
  try {
    // Check users table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    schemaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Count user_roles for the owner
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM user_roles 
      WHERE user_discord_id = $1
    `, ['1212434091337850881']);
    
    console.log('\nUser roles for owner:', countResult.rows[0].count);

    // Get all users
    const usersResult = await pool.query('SELECT discord_id, username FROM users LIMIT 5');
    console.log('\nUsers in database:');
    usersResult.rows.forEach(row => {
      console.log(`  - ${row.username} (${row.discord_id})`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
