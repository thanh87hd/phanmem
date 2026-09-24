import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLifecycleColumns1787920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'Active',
        ADD COLUMN IF NOT EXISTS "resignationDate" character varying,
        ADD COLUMN IF NOT EXISTS "transferDate" character varying,
        ADD COLUMN IF NOT EXISTS "transferDestination" character varying,
        ADD COLUMN IF NOT EXISTS "statusReason" text,
        ADD COLUMN IF NOT EXISTS "statusUpdatedAt" timestamp;

      UPDATE "users" SET "status" = 'Active' WHERE "status" IS NULL;

      CREATE INDEX IF NOT EXISTS idx_users_status ON "users"("status");
      CREATE INDEX IF NOT EXISTS idx_users_resignation_date ON "users"("resignationDate");
      CREATE INDEX IF NOT EXISTS idx_users_transfer_date ON "users"("transferDate");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_users_transfer_date;
      DROP INDEX IF EXISTS idx_users_resignation_date;
      DROP INDEX IF EXISTS idx_users_status;

      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "statusUpdatedAt",
        DROP COLUMN IF EXISTS "statusReason",
        DROP COLUMN IF EXISTS "transferDestination",
        DROP COLUMN IF EXISTS "transferDate",
        DROP COLUMN IF EXISTS "resignationDate",
        DROP COLUMN IF EXISTS "status";
    `);
  }
}
