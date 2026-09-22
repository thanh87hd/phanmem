const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({ connectionString: 'postgres://ktnb:ktnb@2026@localhost:5432/ktnb_db' });
  await client.connect();
  const hash = '$2b$12$tOIq2ZjV87GdM5kIr/Aim.LT/poN9snWah7rBMm62Si9bEvQYYR5e';
  const res = await client.query(`
    UPDATE users 
    SET 
      "passwordHash" = $1,
      "failedLoginAttempts" = 0,
      "lockedUntil" = NULL,
      "isActive" = true,
      "mustChangePassword" = false,
      "passwordChangedAt" = NOW()
    WHERE username = 'admin'
    RETURNING id, username, email, "isActive", "failedLoginAttempts", "lockedUntil", "mustChangePassword";
  `, [hash]);
  console.log('UNIFY LOCAL SUCCESS:', res.rows[0]);
  const verifyMatch = await bcrypt.compare('@bcd1234', hash);
  console.log('BCRYPT VERIFY @bcd1234:', verifyMatch);
  await client.end();
}

main().catch(console.error);
