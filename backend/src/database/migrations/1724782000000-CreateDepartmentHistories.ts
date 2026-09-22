import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDepartmentHistories1724782000000 implements MigrationInterface {
  name = 'CreateDepartmentHistories1724782000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "department_histories" (
        "id" SERIAL NOT NULL,
        "departmentId" integer,
        "departmentCode" character varying NOT NULL,
        "departmentName" character varying NOT NULL,
        "periodYear" integer NOT NULL,
        "unitType" character varying NOT NULL,
        "changeType" character varying NOT NULL DEFAULT 'GiuNguyen',
        "previousUnitType" character varying,
        "decisionNumber" character varying,
        "effectiveDate" date,
        "notes" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_department_histories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_department_histories_department" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dept_hist_dept_year" ON "department_histories" ("departmentId", "periodYear");
      CREATE INDEX IF NOT EXISTS "IDX_dept_hist_change_type" ON "department_histories" ("changeType");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "department_histories"`);
  }
}
