const { Client } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/phanmem',
  });
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_plan_units'");
  console.log('audit_plan_units table exists:', res.rows.length > 0);
  
  if (res.rows.length > 0) {
    const countRes = await client.query("SELECT COUNT(*) FROM audit_plan_units");
    console.log('audit_plan_units row count:', countRes.rows[0].count);
  }
  
  // Check audit_plans selectedUnits count
  const plansRes = await client.query("SELECT id, year, jsonb_array_length(CASE WHEN jsonb_typeof(\"selectedUnits\"::jsonb) = 'array' THEN \"selectedUnits\"::jsonb ELSE '[]'::jsonb END) as units_count FROM audit_plans");
  console.log('audit_plans:', plansRes.rows);

  await client.end();
}

check().catch(console.error);
