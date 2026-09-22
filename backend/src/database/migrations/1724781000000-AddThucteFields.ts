import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThucteFields1724781000000 implements MigrationInterface {
  name = 'AddThucteFields1724781000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══ audit_engagements: postal fields ═══
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
      ADD COLUMN IF NOT EXISTS "postalDepartmentName" character varying,
      ADD COLUMN IF NOT EXISTS "postalRepresentative" text,
      ADD COLUMN IF NOT EXISTS "recipientList" text
    `);

    // ═══ audit_findings: channel, findingCategory, violationHistory, postalAgencyCode ═══
    await queryRunner.query(`
      ALTER TABLE "audit_findings"
      ADD COLUMN IF NOT EXISTS "channel" character varying,
      ADD COLUMN IF NOT EXISTS "findingCategory" character varying,
      ADD COLUMN IF NOT EXISTS "violationHistory" character varying,
      ADD COLUMN IF NOT EXISTS "postalAgencyCode" character varying
    `);

    // ═══ audit_samples: postal and PTD specific columns ═══
    await queryRunner.query(`
      ALTER TABLE "audit_samples"
      ADD COLUMN IF NOT EXISTS "postalAgencyCode" character varying,
      ADD COLUMN IF NOT EXISTS "reconciliationCashDiff" double precision,
      ADD COLUMN IF NOT EXISTS "reportDelayDays" integer,
      ADD COLUMN IF NOT EXISTS "postalProductCode" character varying,
      ADD COLUMN IF NOT EXISTS "postalTransactionType" character varying,
      ADD COLUMN IF NOT EXISTS "userCrossEnv" character varying,
      ADD COLUMN IF NOT EXISTS "damagedAcqtSeries" character varying
    `);

    // ═══ audit_minutes: minuteType, postalRepresentative ═══
    await queryRunner.query(`
      ALTER TABLE "audit_minutes"
      ADD COLUMN IF NOT EXISTS "minuteType" character varying DEFAULT 'MB04_MERGED',
      ADD COLUMN IF NOT EXISTS "postalRepresentative" text
    `);

    // ═══ audit_reports: reportTemplateType, postalDepartmentName, vietnamPostRecipient ═══
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      ADD COLUMN IF NOT EXISTS "reportTemplateType" character varying DEFAULT 'MB01B',
      ADD COLUMN IF NOT EXISTS "postalDepartmentName" character varying,
      ADD COLUMN IF NOT EXISTS "vietnamPostRecipient" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // audit_engagements
    await queryRunner.query(`
      ALTER TABLE "audit_engagements"
      DROP COLUMN IF EXISTS "postalDepartmentName",
      DROP COLUMN IF EXISTS "postalRepresentative",
      DROP COLUMN IF EXISTS "recipientList"
    `);

    // audit_findings
    await queryRunner.query(`
      ALTER TABLE "audit_findings"
      DROP COLUMN IF EXISTS "channel",
      DROP COLUMN IF EXISTS "findingCategory",
      DROP COLUMN IF EXISTS "violationHistory",
      DROP COLUMN IF EXISTS "postalAgencyCode"
    `);

    // audit_samples
    await queryRunner.query(`
      ALTER TABLE "audit_samples"
      DROP COLUMN IF EXISTS "postalAgencyCode",
      DROP COLUMN IF EXISTS "reconciliationCashDiff",
      DROP COLUMN IF EXISTS "reportDelayDays",
      DROP COLUMN IF EXISTS "postalProductCode",
      DROP COLUMN IF EXISTS "postalTransactionType",
      DROP COLUMN IF EXISTS "userCrossEnv",
      DROP COLUMN IF EXISTS "damagedAcqtSeries"
    `);

    // audit_minutes
    await queryRunner.query(`
      ALTER TABLE "audit_minutes"
      DROP COLUMN IF EXISTS "minuteType",
      DROP COLUMN IF EXISTS "postalRepresentative"
    `);

    // audit_reports
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      DROP COLUMN IF EXISTS "reportTemplateType",
      DROP COLUMN IF EXISTS "postalDepartmentName",
      DROP COLUMN IF EXISTS "vietnamPostRecipient"
    `);
  }
}
