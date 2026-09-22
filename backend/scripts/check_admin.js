const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgres://ktnb:ktnb@2026@localhost:5432/ktnb_db' });
  await client.connect();
  const res = await client.query(`
    SELECT u.id, u.username, u.email, u."fullName", r.name as role, u."isActive", u."failedLoginAttempts", u."lockedUntil" 
    FROM users u 
    LEFT JOIN roles r ON u."roleId" = r.id 
    WHERE r.name ILIKE '%admin%' OR u.username ILIKE '%admin%'
  `);
  console.log('ADMIN USERS LOCAL:', res.rows);
  await client.end();
}

main().catch(console.error);
