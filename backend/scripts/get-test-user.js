const { Client } = require('pg');

async function getAdmin() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ktnb_user',
    password: 'ktnb_password',
    database: 'ktnb_v4',
  });
  await client.connect();
  const res = await client.query('SELECT id, username, "fullName", "isActive" FROM users LIMIT 5');
  console.log('Users in DB:', res.rows);
  await client.end();
}

getAdmin();
