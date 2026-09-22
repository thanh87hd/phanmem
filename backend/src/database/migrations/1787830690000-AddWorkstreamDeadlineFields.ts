import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkstreamDeadlineFields1787830690000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_workstreams 
        ADD COLUMN IF NOT EXISTS "startDate" date,
        ADD COLUMN IF NOT EXISTS "dueDate" date,
        ADD COLUMN IF NOT EXISTS "estimatedDays" integer,
        ADD COLUMN IF NOT EXISTS "priority" character varying DEFAULT 'Medium';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_workstreams 
        DROP COLUMN IF EXISTS "startDate",
        DROP COLUMN IF EXISTS "dueDate",
        DROP COLUMN IF EXISTS "estimatedDays",
        DROP COLUMN IF EXISTS "priority";
    `);
  }
}
