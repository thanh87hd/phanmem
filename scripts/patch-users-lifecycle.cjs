const { Client } = require('f:/Phan mem KTNB 4.0/backend/node_modules/pg');
const fs = require('fs');

const envContent = fs.readFileSync('f:/Phan mem KTNB 4.0/backend/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
});

const client = new Client({
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT || '5432'),
  user: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
  database: env.DB_NAME || 'ktnb_v4'
});

async function main() {
  await client.connect();
  console.log('Connected to DB:', env.DB_NAME);
  const sql = `
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Active';
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resignationDate" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "transferDate" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "transferDestination" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "statusReason" text;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "statusUpdatedAt" timestamp;
  `;
  await client.query(sql);
  console.log('✅ Successfully added user lifecycle columns to local PostgreSQL!');
  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
