const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ktnb_user',
    password: 'ktnb_password',
    database: 'ktnb_v4',
  });

  try {
    await client.connect();
    console.log('Connected to ktnb_v4 for teamMembers JSONB migration');

    const sqlPath = path.join(__dirname, 'migrate-team-members-jsonb.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Migration executed successfully!');

    // Verify column type
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_engagements' AND column_name = 'teamMembers';
    `);
    console.log('teamMembers column info:', res.rows[0]);

    // Verify index
    const idxRes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'audit_engagements' AND indexname = 'idx_engagements_team_members_gin';
    `);
    console.log('GIN index info:', idxRes.rows[0]);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
