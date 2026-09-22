const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgres://ktnb:ktnb@2026@localhost:5432/ktnb_db' });
  await client.connect();
  await client.query(`
    ALTER TABLE audit_engagements 
      ADD COLUMN IF NOT EXISTS "isExpectedInfo" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "auditedEntityList" text,
      ADD COLUMN IF NOT EXISTS "surveySentDate" date,
      ADD COLUMN IF NOT EXISTS "surveyReceivedDate" date,
      ADD COLUMN IF NOT EXISTS "handoverMinutesDate" date,
      ADD COLUMN IF NOT EXISTS "detailedMinutesDate" date,
      ADD COLUMN IF NOT EXISTS "summaryMinutesDate" date,
      ADD COLUMN IF NOT EXISTS "exitMeetingDate" date,
      ADD COLUMN IF NOT EXISTS "reportIssuedDate" date;
  `);
  console.log('ALTER TABLE audit_engagements SUCCESS LOCAL');
  await client.end();
}

main().catch(console.error);
