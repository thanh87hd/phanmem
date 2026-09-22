import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWpReviewHistory1724787000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE working_papers 
        ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE working_papers 
        DROP COLUMN IF EXISTS "reviewHistory";
    `);
  }
}
