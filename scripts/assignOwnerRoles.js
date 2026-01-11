const { Pool } = require('pg');
require('dotenv').config({ path: './apps/qft-api-gateway/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function assignOwnerRoles() {
  try {
    // Get all users
    const usersRes = await pool.query('SELECT * FROM users LIMIT 10');
    console.log('Found users:', usersRes.rows.map(u => ({ id: u.id, discord_id: u.discord_id, username: u.username })));

    // Get all roles
    const rolesRes = await pool.query('SELECT * FROM roles');
    console.log('\nAvailable roles:', rolesRes.rows.map(r => ({ id: r.id, name: r.name, clearance_level: r.clearance_level })));

    // Get owner role and admin role
    const ownerRes = await pool.query("SELECT * FROM roles WHERE clearance_level = 'α'");
    const adminRes = await pool.query("SELECT * FROM roles WHERE clearance_level = 'Ω'");

    if (ownerRes.rows.length === 0 || adminRes.rows.length === 0) {
      console.error('Owner or Admin role not found!');
      return;
    }

    const ownerRole = ownerRes.rows[0];
    const adminRole = adminRes.rows[0];

    console.log('\nOwner role:', ownerRole);
    console.log('Admin role:', adminRole);

    if (usersRes.rows.length === 0) {
      console.error('No users found in database!');
      return;
    }

    // Assign both owner and admin roles to the first user (owner)
    const ownerUser = usersRes.rows[0];
    console.log(`\nAssigning owner and admin roles to user: ${ownerUser.username} (${ownerUser.discord_id})`);

    // Check if roles already assigned
    const existingRes = await pool.query(
      'SELECT * FROM user_roles WHERE user_discord_id = $1',
      [ownerUser.discord_id]
    );

    if (existingRes.rows.length > 0) {
      console.log(`User already has ${existingRes.rows.length} role(s) assigned.`);
    }

    // Assign owner role
    await pool.query(
      'INSERT INTO user_roles (user_discord_id, role_id, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [ownerUser.discord_id, ownerRole.id]
    );
    console.log(`✓ Assigned owner role (${ownerRole.name})`);

    // Assign admin role
    await pool.query(
      'INSERT INTO user_roles (user_discord_id, role_id, assigned_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [ownerUser.discord_id, adminRole.id]
    );
    console.log(`✓ Assigned admin role (${adminRole.name})`);

    // Verify assignment
    const verifyRes = await pool.query(
      `SELECT r.* FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_discord_id = $1`,
      [ownerUser.discord_id]
    );

    console.log('\nRoles now assigned to user:');
    verifyRes.rows.forEach(r => {
      console.log(`  - ${r.name} (${r.clearance_level})`);
    });

    console.log('\n✓ Owner roles assignment complete!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

assignOwnerRoles();
