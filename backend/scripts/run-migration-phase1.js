const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'ktnb_password',
  database: process.env.DB_NAME || 'ktnb_v4',
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database:', client.database);

  const sql = `
    ALTER TABLE audit_charters
      ADD COLUMN IF NOT EXISTS "content" text,
      ADD COLUMN IF NOT EXISTS "purpose" text,
      ADD COLUMN IF NOT EXISTS "authority" text,
      ADD COLUMN IF NOT EXISTS "responsibility" text,
      ADD COLUMN IF NOT EXISTS "scope" text,
      ADD COLUMN IF NOT EXISTS "reportingLine" text,
      ADD COLUMN IF NOT EXISTS "independenceStatement" text,
      ADD COLUMN IF NOT EXISTS "standardsConformance" text,
      ADD COLUMN IF NOT EXISTS "draftedById" integer,
      ADD COLUMN IF NOT EXISTS "draftedByName" character varying,
      ADD COLUMN IF NOT EXISTS "approvedById" integer,
      ADD COLUMN IF NOT EXISTS "approvedByName" character varying,
      ADD COLUMN IF NOT EXISTS "approvalBody" character varying,
      ADD COLUMN IF NOT EXISTS "effectiveDate" date,
      ADD COLUMN IF NOT EXISTS "expiryDate" date,
      ADD COLUMN IF NOT EXISTS "nextReviewDate" date,
      ADD COLUMN IF NOT EXISTS "approvalNotes" text,
      ADD COLUMN IF NOT EXISTS "revisionHistory" jsonb,
      ADD COLUMN IF NOT EXISTS "documentUrl" character varying;

    UPDATE audit_charters SET "purpose" = "content" WHERE "purpose" IS NULL AND "content" IS NOT NULL;
    UPDATE audit_charters SET "content" = "purpose" WHERE "content" IS NULL AND "purpose" IS NOT NULL;

    ALTER TABLE kri_alerts
      ADD COLUMN IF NOT EXISTS "observedValue" character varying,
      ADD COLUMN IF NOT EXISTS "departmentId" integer;

    UPDATE kri_alerts 
    SET "observedValue" = COALESCE("currentValue", "figure")
    WHERE "observedValue" IS NULL;

    -- Record in migrations table if exists
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL
    );
    INSERT INTO "migrations" ("timestamp", "name")
    SELECT 1787830700000, 'ConsolidateAuditCharterAndKriAlert1787830700000'
    WHERE NOT EXISTS (
      SELECT 1 FROM "migrations" WHERE "name" = 'ConsolidateAuditCharterAndKriAlert1787830700000'
    );
  `;

  await client.query(sql);
  console.log('Migration 1787830700000 executed successfully!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration error:', err);
  client.end();
  process.exit(1);
});
