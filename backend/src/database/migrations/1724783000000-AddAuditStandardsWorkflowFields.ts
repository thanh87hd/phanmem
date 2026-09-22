import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditStandardsWorkflowFields1724783000000 implements MigrationInterface {
  name = 'AddAuditStandardsWorkflowFields1724783000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. audit_universe: Kế thừa rủi ro
    await queryRunner.query(`
      ALTER TABLE "audit_universe"
      ADD COLUMN IF NOT EXISTS "transferredFromUniverseId" integer,
      ADD COLUMN IF NOT EXISTS "transferredFromDeptCode" character varying,
      ADD COLUMN IF NOT EXISTS "transferredRiskScore" double precision,
      ADD COLUMN IF NOT EXISTS "transferNotes" text
    `);

    // 2. audit_engagements: Chính thức hóa đoàn 2 pha
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
      ADD COLUMN IF NOT EXISTS "samplingPlanDocUrl" character varying,
      ADD COLUMN IF NOT EXISTS "isOfficialized" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "officializedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "officializedBy" character varying
    `);

    // 3. audit_sample_batches: Phân công KTV & Luồng đổi mẫu
    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
      ADD COLUMN IF NOT EXISTS "assignedAuditorId" integer,
      ADD COLUMN IF NOT EXISTS "assignedAuditorName" character varying,
      ADD COLUMN IF NOT EXISTS "changeStatus" character varying DEFAULT 'None',
      ADD COLUMN IF NOT EXISTS "changeReason" text,
      ADD COLUMN IF NOT EXISTS "changeRequestedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "changeApprovedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "changeApprovedBy" character varying,
      ADD COLUMN IF NOT EXISTS "reportedToDepartmentAt" TIMESTAMP
    `);

    // 4. audit_minutes: Đếm số lần Trưởng đoàn review BB
    await queryRunner.query(`
      ALTER TABLE "audit_minutes"
      ADD COLUMN IF NOT EXISTS "leadReviewCount" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb
    `);

    // 5. audit_reports: Đếm số lần Lãnh đạo Phòng review BC
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      ADD COLUMN IF NOT EXISTS "managerReviewCount" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_universe"
      DROP COLUMN IF EXISTS "transferredFromUniverseId",
      DROP COLUMN IF EXISTS "transferredFromDeptCode",
      DROP COLUMN IF EXISTS "transferredRiskScore",
      DROP COLUMN IF EXISTS "transferNotes"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
      DROP COLUMN IF EXISTS "samplingPlanDocUrl",
      DROP COLUMN IF EXISTS "isOfficialized",
      DROP COLUMN IF EXISTS "officializedAt",
      DROP COLUMN IF EXISTS "officializedBy"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
      DROP COLUMN IF EXISTS "assignedAuditorId",
      DROP COLUMN IF EXISTS "assignedAuditorName",
      DROP COLUMN IF EXISTS "changeStatus",
      DROP COLUMN IF EXISTS "changeReason",
      DROP COLUMN IF EXISTS "changeRequestedAt",
      DROP COLUMN IF EXISTS "changeApprovedAt",
      DROP COLUMN IF EXISTS "changeApprovedBy",
      DROP COLUMN IF EXISTS "reportedToDepartmentAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_minutes"
      DROP COLUMN IF EXISTS "leadReviewCount",
      DROP COLUMN IF EXISTS "reviewHistory"
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      DROP COLUMN IF EXISTS "managerReviewCount",
      DROP COLUMN IF EXISTS "reviewHistory"
    `);
  }
}
