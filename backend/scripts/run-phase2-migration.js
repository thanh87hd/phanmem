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

    // 1. Tạo bảng file_assets
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_assets (
        id SERIAL PRIMARY KEY,
        "storageKey" VARCHAR(500) NOT NULL,
        "originalName" VARCHAR(255) NOT NULL,
        "mimeType" VARCHAR(100) NOT NULL,
        "size" BIGINT NOT NULL,
        "checksum" VARCHAR(64),
        "uploadedById" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created table file_assets (or verified existence)');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_file_assets_checksum ON file_assets("checksum");
      CREATE INDEX IF NOT EXISTS idx_file_assets_storage_key ON file_assets("storageKey");
    `);

    // 2. Tạo bảng file_links
    await client.query(`
      CREATE TABLE IF NOT EXISTS file_links (
        id SERIAL PRIMARY KEY,
        "fileAssetId" INTEGER NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
        "ownerType" VARCHAR(100) NOT NULL,
        "ownerId" INTEGER NOT NULL,
        "relationType" VARCHAR(50) NOT NULL DEFAULT 'attachment',
        "caption" TEXT,
        "metadata" JSONB DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created table file_links (or verified existence)');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_file_links_owner ON file_links("ownerType", "ownerId");
      CREATE INDEX IF NOT EXISTS idx_file_links_asset_id ON file_links("fileAssetId");
      CREATE INDEX IF NOT EXISTS idx_file_links_relation_type ON file_links("relationType");
    `);

    // 3. Tạo bảng evidence_verifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS evidence_verifications (
        id SERIAL PRIMARY KEY,
        "fileLinkId" INTEGER NOT NULL REFERENCES file_links(id) ON DELETE CASCADE,
        "status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
        "result" TEXT,
        "verifiedById" INTEGER,
        "verifiedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created table evidence_verifications (or verified existence)');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_verifications_file_link ON evidence_verifications("fileLinkId");
      CREATE INDEX IF NOT EXISTS idx_evidence_verifications_status ON evidence_verifications("status");
    `);

    // 4. Backfill dữ liệu từ documents (nếu có)
    const docBackfill = await client.query(`
      INSERT INTO file_assets ("storageKey", "originalName", "mimeType", "size", "checksum", "uploadedById", "createdAt", "updatedAt")
      SELECT 
        d.path,
        d."originalName",
        d."mimeType",
        d.size,
        NULL,
        d."uploadedBy",
        d."createdAt",
        d."updatedAt"
      FROM documents d
      WHERE NOT EXISTS (
        SELECT 1 FROM file_assets fa WHERE fa."storageKey" = d.path
      );
    `);
    console.log(`Backfilled ${docBackfill.rowCount} records from documents into file_assets`);

    const docLinksBackfill = await client.query(`
      INSERT INTO file_links ("fileAssetId", "ownerType", "ownerId", "relationType", "caption", "metadata", "createdAt", "updatedAt")
      SELECT 
        fa.id,
        COALESCE(d."linkedResource", 'Document'),
        COALESCE(d."linkedResourceId", d.id),
        COALESCE(d."documentType", 'File'),
        d.category,
        jsonb_build_object(
          'legacyTable', 'documents',
          'legacyId', d.id,
          'uploadedByName', d."uploadedByName",
          'category', d.category
        ),
        d."createdAt",
        d."updatedAt"
      FROM documents d
      JOIN file_assets fa ON fa."storageKey" = d.path
      WHERE NOT EXISTS (
        SELECT 1 FROM file_links fl 
        WHERE fl."metadata"->>'legacyTable' = 'documents' 
          AND (fl."metadata"->>'legacyId')::int = d.id
      );
    `);
    console.log(`Backfilled ${docLinksBackfill.rowCount} records from documents into file_links`);

    // 5. Backfill dữ liệu từ evidences (nếu có)
    const eviBackfill = await client.query(`
      INSERT INTO file_assets ("storageKey", "originalName", "mimeType", "size", "checksum", "uploadedById", "createdAt", "updatedAt")
      SELECT 
        e.path,
        e."originalName",
        e."mimeType",
        e.size,
        NULL,
        e."uploadedBy",
        e."uploadedAt",
        e."updatedAt"
      FROM evidences e
      WHERE NOT EXISTS (
        SELECT 1 FROM file_assets fa WHERE fa."storageKey" = e.path
      );
    `);
    console.log(`Backfilled ${eviBackfill.rowCount} records from evidences into file_assets`);

    const eviLinksBackfill = await client.query(`
      INSERT INTO file_links ("fileAssetId", "ownerType", "ownerId", "relationType", "caption", "metadata", "createdAt", "updatedAt")
      SELECT 
        fa.id,
        COALESCE(e."linkedResource", 'Evidence'),
        COALESCE(e."linkedResourceId", e.id),
        'evidence',
        e.description,
        jsonb_build_object(
          'legacyTable', 'evidences',
          'legacyId', e.id,
          'uploadedByName', e."uploadedByName",
          'version', e.version
        ),
        e."uploadedAt",
        e."updatedAt"
      FROM evidences e
      JOIN file_assets fa ON fa."storageKey" = e.path
      WHERE NOT EXISTS (
        SELECT 1 FROM file_links fl 
        WHERE fl."metadata"->>'legacyTable' = 'evidences' 
          AND (fl."metadata"->>'legacyId')::int = e.id
      );
    `);
    console.log(`Backfilled ${eviLinksBackfill.rowCount} records from evidences into file_links`);

    const eviVerifBackfill = await client.query(`
      INSERT INTO evidence_verifications ("fileLinkId", "status", "result", "verifiedById", "verifiedAt", "createdAt", "updatedAt")
      SELECT
        fl.id,
        COALESCE(e."aiVerificationStatus", 'Pending'),
        e."aiVerificationResult",
        NULL,
        CASE WHEN e."aiVerificationStatus" IN ('Verified', 'Rejected') THEN e."updatedAt" ELSE NULL END,
        e."uploadedAt",
        e."updatedAt"
      FROM evidences e
      JOIN file_links fl ON fl."metadata"->>'legacyTable' = 'evidences' AND (fl."metadata"->>'legacyId')::int = e.id
      WHERE NOT EXISTS (
        SELECT 1 FROM evidence_verifications ev WHERE ev."fileLinkId" = fl.id
      );
    `);
    console.log(`Backfilled ${eviVerifBackfill.rowCount} records into evidence_verifications`);

    // 6. Ghi nhận vào bảng migrations
    const migrationName = 'CreateUnifiedFileAssetAndLinkTables1787830800000';
    const timestamp = '1787830800000';
    const checkMig = await client.query('SELECT 1 FROM migrations WHERE "name" = $1', [migrationName]);
    if (checkMig.rows.length === 0) {
      await client.query(
        'INSERT INTO migrations ("timestamp", "name") VALUES ($1, $2)',
        [timestamp, migrationName]
      );
      console.log(`Recorded migration ${migrationName} in migrations table`);
    }

    await client.query('COMMIT');
    console.log('Migration Phase 2 completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
