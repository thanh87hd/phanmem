const { Client } = require('pg');

async function verify() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ktnb_user',
    password: 'ktnb_password',
    database: 'ktnb_v4',
  });

  try {
    await client.connect();

    const wpRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'working_papers' AND column_name = 'version';
    `);
    console.log('Working Papers version column:', wpRes.rows[0]);

    const afRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_findings' AND column_name = 'version';
    `);
    console.log('Audit Findings version column:', afRes.rows[0]);

    const partRes = await client.query(`
      SELECT inhrelid::regclass::text AS partition_name 
      FROM pg_inherits 
      WHERE inhparent = 'audit_logs_partitioned'::regclass
      ORDER BY 1;
    `);
    console.log('Audit logs partitions count:', partRes.rows.length);
    console.log('Partitions list:', partRes.rows.map(r => r.partition_name));

  } catch (err) {
    console.error('Error verifying DB architecture:', err);
  } finally {
    await client.end();
  }
}

verify();
