import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchControlAssessment1724790000000 implements MigrationInterface {
  name = 'AddBatchControlAssessment1724790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
        ADD COLUMN IF NOT EXISTS "controlEffectiveness" character varying(50),
        ADD COLUMN IF NOT EXISTS "controlConclusion" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_sample_batches"
        DROP COLUMN IF EXISTS "controlEffectiveness",
        DROP COLUMN IF EXISTS "controlConclusion";
    `);
  }
}
