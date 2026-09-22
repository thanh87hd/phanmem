import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFindingLifecycleAuditColumns1787831100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_findings
        ADD COLUMN IF NOT EXISTS "withdrawalReason" text,
        ADD COLUMN IF NOT EXISTS "withdrawnById" integer,
        ADD COLUMN IF NOT EXISTS "withdrawnAt" timestamp,
        ADD COLUMN IF NOT EXISTS "returnReason" text,
        ADD COLUMN IF NOT EXISTS "returnedById" integer,
        ADD COLUMN IF NOT EXISTS "returnedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "confirmedById" integer,
        ADD COLUMN IF NOT EXISTS "confirmedAt" timestamp;

      CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings("status");
      CREATE INDEX IF NOT EXISTS idx_audit_findings_withdrawn_by ON audit_findings("withdrawnById");
      CREATE INDEX IF NOT EXISTS idx_audit_findings_returned_by ON audit_findings("returnedById");
      CREATE INDEX IF NOT EXISTS idx_audit_findings_confirmed_by ON audit_findings("confirmedById");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_audit_findings_confirmed_by;
      DROP INDEX IF EXISTS idx_audit_findings_returned_by;
      DROP INDEX IF EXISTS idx_audit_findings_withdrawn_by;
      DROP INDEX IF EXISTS idx_audit_findings_status;

      ALTER TABLE audit_findings
        DROP COLUMN IF EXISTS "confirmedAt",
        DROP COLUMN IF EXISTS "confirmedById",
        DROP COLUMN IF EXISTS "returnedAt",
        DROP COLUMN IF EXISTS "returnedById",
        DROP COLUMN IF EXISTS "returnReason",
        DROP COLUMN IF EXISTS "withdrawnAt",
        DROP COLUMN IF EXISTS "withdrawnById",
        DROP COLUMN IF EXISTS "withdrawalReason";
    `);
  }
}
