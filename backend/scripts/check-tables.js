const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://ktnb:ktnb@2026@localhost:5432/ktnb_db',
  });

  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Tables found:');
  res.rows.forEach(r => console.log(' -', r.table_name));

  await client.end();
}

checkTables().catch(console.error);
