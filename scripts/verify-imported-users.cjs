const { Client } = require('f:/Phan mem KTNB 4.0/backend/node_modules/pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'ktnb_v4'
});

async function main() {
  await client.connect();
  const sql = `
    SELECT u.id, u.username, u."fullName", u."employeeId", u.department, u."jobTitle", r.name as role, u.status, u."isActive", u."startDate", u."birthDate"
    FROM users u
    LEFT JOIN roles r ON u."roleId" = r.id
    WHERE u."employeeId" IS NOT NULL
    ORDER BY u.id
    LIMIT 10
  `;
  const res = await client.query(sql);
  console.log('Sample 10 imported users in local DB:');
  console.table(res.rows);

  const count = await client.query("SELECT count(*) as total, count(*) filter (where status = 'Active') as active_count FROM users");
  console.log('Total user statistics:', count.rows[0]);
  await client.end();
}

main().catch(console.error);
