import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateAuditCharterAndKriAlert1787830700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. audit_charters: Bổ sung các cột cấu trúc và cột content để hợp nhất 2 schema
    await queryRunner.query(`
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
    `);

    // Backfill tương thích qua lại giữa content và purpose
    await queryRunner.query(`
      UPDATE audit_charters SET "purpose" = "content" WHERE "purpose" IS NULL AND "content" IS NOT NULL;
      UPDATE audit_charters SET "content" = "purpose" WHERE "content" IS NULL AND "purpose" IS NOT NULL;
    `);

    // 2. kri_alerts: Bổ sung observedValue và departmentId chuẩn hóa
    await queryRunner.query(`
      ALTER TABLE kri_alerts
        ADD COLUMN IF NOT EXISTS "observedValue" character varying,
        ADD COLUMN IF NOT EXISTS "departmentId" integer;
    `);

    // Backfill observedValue từ currentValue hoặc figure
    await queryRunner.query(`
      UPDATE kri_alerts 
      SET "observedValue" = COALESCE("currentValue", "figure")
      WHERE "observedValue" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lưu ý: Theo nguyên tắc triển khai, không drop column bừa bãi.
    // Down migration chỉ drop các cột mới thêm nếu thực sự cần rollback migration này.
    await queryRunner.query(`
      ALTER TABLE audit_charters
        DROP COLUMN IF EXISTS "purpose",
        DROP COLUMN IF EXISTS "authority",
        DROP COLUMN IF EXISTS "responsibility",
        DROP COLUMN IF EXISTS "scope",
        DROP COLUMN IF EXISTS "reportingLine",
        DROP COLUMN IF EXISTS "independenceStatement",
        DROP COLUMN IF EXISTS "standardsConformance",
        DROP COLUMN IF EXISTS "draftedById",
        DROP COLUMN IF EXISTS "draftedByName",
        DROP COLUMN IF EXISTS "approvedById",
        DROP COLUMN IF EXISTS "approvedByName",
        DROP COLUMN IF EXISTS "approvalBody",
        DROP COLUMN IF EXISTS "effectiveDate",
        DROP COLUMN IF EXISTS "expiryDate",
        DROP COLUMN IF EXISTS "nextReviewDate",
        DROP COLUMN IF EXISTS "approvalNotes",
        DROP COLUMN IF EXISTS "revisionHistory",
        DROP COLUMN IF EXISTS "documentUrl";
    `);

    await queryRunner.query(`
      ALTER TABLE kri_alerts
        DROP COLUMN IF EXISTS "observedValue",
        DROP COLUMN IF EXISTS "departmentId";
    `);
  }
}
