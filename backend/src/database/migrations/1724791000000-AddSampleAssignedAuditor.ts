import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSampleAssignedAuditor1724791000000 implements MigrationInterface {
  name = 'AddSampleAssignedAuditor1724791000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_samples"
        ADD COLUMN IF NOT EXISTS "assignedAuditorId" integer,
        ADD COLUMN IF NOT EXISTS "assignedAuditorName" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_samples"
        DROP COLUMN IF EXISTS "assignedAuditorId",
        DROP COLUMN IF EXISTS "assignedAuditorName";
    `);
  }
}
