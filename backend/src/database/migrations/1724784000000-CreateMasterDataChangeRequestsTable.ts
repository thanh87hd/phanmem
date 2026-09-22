import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMasterDataChangeRequestsTable1724784000000 implements MigrationInterface {
  name = 'CreateMasterDataChangeRequestsTable1724784000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."master_data_change_requests_category_enum" AS ENUM('ORGANIZATION', 'RISK', 'DEFECT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."master_data_change_requests_changetype_enum" AS ENUM('ADD', 'UPDATE', 'DEACTIVATE', 'RESTRUCTURE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."master_data_change_requests_status_enum" AS ENUM('Pending_L1', 'Pending_L2', 'Approved', 'Rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "master_data_change_requests" (
        "id" SERIAL NOT NULL,
        "category" "public"."master_data_change_requests_category_enum" NOT NULL DEFAULT 'ORGANIZATION',
        "changeType" "public"."master_data_change_requests_changetype_enum" NOT NULL DEFAULT 'ADD',
        "targetId" integer,
        "targetCode" character varying,
        "title" text NOT NULL,
        "reason" text,
        "proposedData" jsonb,
        "currentData" jsonb,
        "isMidYearAddition" boolean NOT NULL DEFAULT true,
        "riskImpactLevel" integer NOT NULL DEFAULT 2,
        "status" "public"."master_data_change_requests_status_enum" NOT NULL DEFAULT 'Pending_L1',
        "requestedBy" character varying,
        "requestedByUserId" integer,
        "reviewerL1Name" character varying,
        "reviewerL1Notes" character varying,
        "reviewedL1At" TIMESTAMP,
        "approverL2Name" character varying,
        "approverL2Notes" character varying,
        "approvedL2At" TIMESTAMP,
        "kpiBonusPoints" double precision NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_master_data_change_requests" PRIMARY KEY ("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "master_data_change_requests"`,
    );
  }
}
