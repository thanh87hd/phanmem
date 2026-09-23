import { MigrationInterface, QueryRunner } from 'typeorm';

export class EngagementFieldworkRefactor1787900000000 implements MigrationInterface {
  name = 'EngagementFieldworkRefactor1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ══════════════════════════════════════════════════════════════
    // BƯỚC 1: SAO LƯU SNAPSHOT NGUYÊN TRẠNG TRƯỚC KHI MIGRATION
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_engagements') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_audit_engagements AS SELECT * FROM audit_engagements;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'working_papers') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_working_papers AS SELECT * FROM working_papers;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_workstreams') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_audit_workstreams AS SELECT * FROM audit_workstreams;
        END IF;
      END $$;
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 2: TẠO BẢNG CHUẨN audit_review_notes (MẪU BIỂU MB-10)
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_review_notes" (
        "id" SERIAL NOT NULL,
        "reviewSeq" character varying(50),
        "engagementId" integer NOT NULL,
        "workingPaperId" integer,
        "workstreamId" integer,
        "reviewerId" integer,
        "reviewerName" character varying(255),
        "note" text NOT NULL,
        "auditorResponse" text,
        "auditorId" integer,
        "auditorName" character varying(255),
        "responseAt" TIMESTAMP,
        "status" character varying(20) NOT NULL DEFAULT 'OPEN',
        "closedAt" TIMESTAMP,
        "closedById" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_review_notes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_review_notes_engagement" FOREIGN KEY ("engagementId") REFERENCES "audit_engagements"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audit_review_notes_wp" FOREIGN KEY ("workingPaperId") REFERENCES "working_papers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audit_review_notes_workstream" FOREIGN KEY ("workstreamId") REFERENCES "audit_workstreams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audit_review_notes_reviewer" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_audit_review_notes_auditor" FOREIGN KEY ("auditorId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_audit_review_notes_closedBy" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS "IDX_review_notes_engagement_status" ON "audit_review_notes" ("engagementId", "status");
      CREATE INDEX IF NOT EXISTS "IDX_review_notes_wp_status" ON "audit_review_notes" ("workingPaperId", "status");
      CREATE INDEX IF NOT EXISTS "IDX_review_notes_workstream_status" ON "audit_review_notes" ("workstreamId", "status");
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 3: CHUẨN HÓA CÁC TRƯỜNG CHỮ KÝ DUYỆT TRÊN working_papers
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE "working_papers" ADD COLUMN IF NOT EXISTS "preparerId" integer;
      ALTER TABLE "working_papers" ADD COLUMN IF NOT EXISTS "preparedAt" TIMESTAMP;
      ALTER TABLE "working_papers" ADD COLUMN IF NOT EXISTS "leadAuditorId" integer;
      ALTER TABLE "working_papers" ADD COLUMN IF NOT EXISTS "leadApprovedAt" TIMESTAMP;
      ALTER TABLE "working_papers" ADD COLUMN IF NOT EXISTS "signoffStatus" character varying(30) DEFAULT 'DRAFT';
    `);

    // Backfill preparerId từ creatorId nếu có
    await queryRunner.query(`
      UPDATE "working_papers"
      SET "preparerId" = "creatorId",
          "preparedAt" = COALESCE("submittedAt", "createdAt"),
          "signoffStatus" = CASE 
            WHEN "status" IN ('Approved', 'APPROVED') THEN 'APPROVED'
            WHEN "status" IN ('Submitted', 'PendingReview', 'SUBMITTED') THEN 'SUBMITTED'
            WHEN "status" IN ('UnderReview', 'UNDER_REVIEW') THEN 'UNDER_REVIEW'
            WHEN "status" IN ('Rework', 'Rejected', 'REWORK') THEN 'REWORK'
            ELSE 'DRAFT'
          END
      WHERE "preparerId" IS NULL;
    `);

    // Backfill review notes từ các ghi chú reviewNotes text cũ trên working_papers
    await queryRunner.query(`
      INSERT INTO "audit_review_notes" ("engagementId", "workingPaperId", "reviewerId", "reviewerName", "note", "status", "createdAt", "updatedAt")
      SELECT 
        wp."engagementId",
        wp."id",
        wp."reviewerId",
        wp."reviewedBy",
        wp."reviewNotes",
        CASE WHEN wp."status" = 'Approved' THEN 'CLOSED' ELSE 'OPEN' END,
        COALESCE(wp."reviewedAt", wp."createdAt", now()),
        now()
      FROM "working_papers" wp
      WHERE wp."reviewNotes" IS NOT NULL 
        AND TRIM(wp."reviewNotes") <> ''
        AND wp."engagementId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "audit_review_notes" arn WHERE arn."workingPaperId" = wp."id"
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_review_notes" CASCADE;`);
    await queryRunner.query(`
      ALTER TABLE "working_papers" 
      DROP COLUMN IF EXISTS "preparerId",
      DROP COLUMN IF EXISTS "preparedAt",
      DROP COLUMN IF EXISTS "leadAuditorId",
      DROP COLUMN IF EXISTS "leadApprovedAt",
      DROP COLUMN IF EXISTS "signoffStatus";
    `);
  }
}
