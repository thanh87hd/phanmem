const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ktnb_db',
});

async function main() {
  await client.connect();
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('@bcd1234', 10);
  await client.query('UPDATE users SET "passwordHash" = $1 WHERE username = $2', [hash, 'danhpc']);
  console.log('Reset danhpc password to @bcd1234 successfully');
  
  const roles = await client.query('SELECT * FROM roles');
  console.log('All roles in DB:', roles.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
