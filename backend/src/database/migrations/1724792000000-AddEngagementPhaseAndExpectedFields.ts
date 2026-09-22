import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEngagementPhaseAndExpectedFields1724792000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_engagements 
        DROP COLUMN IF EXISTS "isExpectedInfo",
        DROP COLUMN IF EXISTS "auditedEntityList",
        DROP COLUMN IF EXISTS "surveySentDate",
        DROP COLUMN IF EXISTS "surveyReceivedDate",
        DROP COLUMN IF EXISTS "handoverMinutesDate",
        DROP COLUMN IF EXISTS "detailedMinutesDate",
        DROP COLUMN IF EXISTS "summaryMinutesDate",
        DROP COLUMN IF EXISTS "exitMeetingDate",
        DROP COLUMN IF EXISTS "reportIssuedDate";
    `);
  }
}
