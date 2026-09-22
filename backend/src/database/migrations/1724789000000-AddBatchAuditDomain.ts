import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchAuditDomain1724789000000 implements MigrationInterface {
  name = 'AddBatchAuditDomain1724789000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
        ADD COLUMN IF NOT EXISTS "auditDomain" character varying(50) DEFAULT 'CREDIT';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
        DROP COLUMN IF EXISTS "auditDomain";
    `);
  }
}
