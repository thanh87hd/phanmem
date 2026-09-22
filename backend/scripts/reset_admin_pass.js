const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const hash = await bcrypt.hash('Password@123', 10);
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'ktnb',
    password: process.env.DB_PASSWORD || 'ktnb@2026',
    database: process.env.DB_NAME || 'ktnb_db',
  });
  await client.connect();
  await client.query(`UPDATE users SET "passwordHash" = $1, "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE username = 'admin'`, [hash]);
  console.log('✅ Admin password successfully set to Password@123 and unlocked!');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
