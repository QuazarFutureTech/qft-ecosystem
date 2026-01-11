require('dotenv').config();
const db = require('./apps/qft-api-gateway/src/db');

const testUserId = '1212434091337850881';

async function test() {
  try {
    // Check if user exists
    const userResult = await db.query('SELECT * FROM users WHERE discord_id = $1', [testUserId]);
    console.log('User found:', userResult.rows[0]?.username);
    console.log('User discord_id:', userResult.rows[0]?.discord_id);

    // Check user roles
    const rolesResult = await db.query(
      `SELECT r.*, ur.assigned_at
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_discord_id = $1`,
      [testUserId]
    );
    console.log('User roles count:', rolesResult.rows.length);
    console.log('User roles:', rolesResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
