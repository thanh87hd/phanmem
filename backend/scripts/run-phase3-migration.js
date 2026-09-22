const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ktnb_v4',
  });

  await client.connect();
  console.log('Connected to PostgreSQL database:', process.env.DB_NAME || 'ktnb_v4');

  try {
    await client.query('BEGIN');

    // 1. Tạo indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recommendations_finding_id ON recommendations("findingId");
      CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations("status");
      CREATE INDEX IF NOT EXISTS idx_recommendations_department_id ON recommendations("departmentId");
      CREATE INDEX IF NOT EXISTS idx_recommendations_assigned_to_id ON recommendations("assignedToId");
    `);
    console.log('Created/verified indexes on recommendations table');

    // 2. Backfill dữ liệu từ audit_findings sang recommendations
    const backfillRes = await client.query(`
      INSERT INTO recommendations (
        "findingId",
        "finding",
        "recommendation",
        "departmentId",
        "department",
        "status",
        "progressPercent",
        "createdAt",
        "updatedAt"
      )
      SELECT
        af.id,
        COALESCE(af."findingTitle", 'Phát hiện kiểm toán #' || af.id),
        af.recommendation,
        COALESCE(af."responsibleUnitId", af."managingBranchId"),
        af."managingBranchName",
        'Open',
        0,
        af."createdAt",
        af."updatedAt"
      FROM audit_findings af
      WHERE af.recommendation IS NOT NULL 
        AND LENGTH(TRIM(af.recommendation)) > 0
        AND NOT EXISTS (
          SELECT 1 FROM recommendations r WHERE r."findingId" = af.id
        );
    `);
    console.log(`Backfilled ${backfillRes.rowCount} recommendations from legacy text in audit_findings`);

    // 3. Đồng bộ hóa snapshot findingTitle
    const syncRes = await client.query(`
      UPDATE recommendations r
      SET "finding" = af."findingTitle"
      FROM audit_findings af
      WHERE r."findingId" = af.id
        AND (r."finding" IS NULL OR r."finding" = '');
    `);
    console.log(`Synchronized findingTitle snapshot for ${syncRes.rowCount} recommendations`);

    // 4. Ghi nhận vào bảng migrations
    const migrationName = 'BackfillFindingsRecommendationsRelation1787830900000';
    const timestamp = '1787830900000';
    const checkMig = await client.query('SELECT 1 FROM migrations WHERE "name" = $1', [migrationName]);
    if (checkMig.rows.length === 0) {
      await client.query(
        'INSERT INTO migrations ("timestamp", "name") VALUES ($1, $2)',
        [timestamp, migrationName]
      );
      console.log(`Recorded migration ${migrationName} in migrations table`);
    }

    await client.query('COMMIT');
    console.log('Migration Phase 3 completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
