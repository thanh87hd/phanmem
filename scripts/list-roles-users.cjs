const { Client } = require('f:/Phan mem KTNB 4.0/backend/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'ktnb',
  password: 'ktnb_password_prod',
  database: 'ktnb_v4'
});

async function run() {
  await client.connect();
  const roles = await client.query('SELECT id, name, description FROM roles ORDER BY id');
  console.log('--- ROLES ---');
  console.table(roles.rows);

  const users = await client.query(`
    SELECT u.id, u.username, u."fullName", u."jobTitle", u.department, r.name as role_name 
    FROM users u 
    LEFT JOIN roles r ON u."roleId" = r.id 
    ORDER BY u.id
  `);
  console.log(`--- TOTAL USERS: ${users.rows.length} ---`);
  for (let i = 0; i < users.rows.length; i += 25) {
    console.table(users.rows.slice(i, i + 25));
  }

  await client.end();
}

run().catch(console.error);
