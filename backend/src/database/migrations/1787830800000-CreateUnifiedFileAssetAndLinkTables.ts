import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUnifiedFileAssetAndLinkTables1787830800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng file_assets (Quản lý file vật lý duy nhất, deduplication bằng checksum)
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_file_assets_checksum ON file_assets("checksum");
      CREATE INDEX IF NOT EXISTS idx_file_assets_storage_key ON file_assets("storageKey");
    `);

    // 2. Tạo bảng file_links (Gắn liên kết đa hình giữa asset và business owner)
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_file_links_owner ON file_links("ownerType", "ownerId");
      CREATE INDEX IF NOT EXISTS idx_file_links_asset_id ON file_links("fileAssetId");
      CREATE INDEX IF NOT EXISTS idx_file_links_relation_type ON file_links("relationType");
    `);

    // 3. Tạo bảng evidence_verifications (Thẩm định bằng chứng)
    await queryRunner.query(`
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evidence_verifications_file_link ON evidence_verifications("fileLinkId");
      CREATE INDEX IF NOT EXISTS idx_evidence_verifications_status ON evidence_verifications("status");
    `);

    // 4. Backfill dữ liệu từ bảng documents (nếu có dữ liệu)
    await queryRunner.query(`
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

    await queryRunner.query(`
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

    // 5. Backfill dữ liệu từ bảng evidences (nếu có dữ liệu)
    await queryRunner.query(`
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

    await queryRunner.query(`
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

    await queryRunner.query(`
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS evidence_verifications;`);
    await queryRunner.query(`DROP TABLE IF EXISTS file_links;`);
    await queryRunner.query(`DROP TABLE IF EXISTS file_assets;`);
  }
}
