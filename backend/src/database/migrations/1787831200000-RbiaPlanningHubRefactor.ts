import { MigrationInterface, QueryRunner } from 'typeorm';

export class RbiaPlanningHubRefactor1787831200000 implements MigrationInterface {
  name = 'RbiaPlanningHubRefactor1787831200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ══════════════════════════════════════════════════════════════
    // BƯỚC 1: SAO LƯU SNAPSHOT NGUYÊN TRẠNG TRƯỚC KHI MIGRATION
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_departments AS SELECT * FROM departments;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_universe') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_audit_universe AS SELECT * FROM audit_universe;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_control_matrix') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_rcm AS SELECT * FROM risk_control_matrix;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_registers') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_risk_registers AS SELECT * FROM risk_registers;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_assessments') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_risk_assessments AS SELECT * FROM risk_assessments;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_plans') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_audit_plans AS SELECT * FROM audit_plans;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'resource_demands') THEN
          CREATE TABLE IF NOT EXISTS _snapshot_resource_demands AS SELECT * FROM resource_demands;
        END IF;
      END $$;
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 2: CHUẨN HÓA CƠ CẤU ĐƠN VỊ (DEPARTMENT) BẰNG parentId
    // ══════════════════════════════════════════════════════════════
    const hasDeptParentCol = await queryRunner.hasColumn('departments', 'parent');
    if (hasDeptParentCol) {
      // Backfill parentId từ mã code parent
      await queryRunner.query(`
        UPDATE departments d
        SET "parentId" = p.id
        FROM departments p
        WHERE d."parentId" IS NULL
          AND d.parent IS NOT NULL
          AND TRIM(d.parent) = TRIM(p.code);
      `);

      // Xóa cột legacy text parent
      await queryRunner.query(`ALTER TABLE departments DROP COLUMN parent;`);
    }

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 3: CHUẨN HÓA AUDIT UNIVERSE (LOẠI BỎ ĐIỂM SỐ NHẬP TAY)
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "financialSize";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "operationalRiskScore";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "pastFindingsScore";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "riskScore";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "dynamicRiskRating";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "scoreDetails";
      ALTER TABLE audit_universe DROP COLUMN IF EXISTS "transferredRiskScore";
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 4: THƯ VIỆN RCM & RISK PROFILE
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE risk_control_matrix ADD COLUMN IF NOT EXISTS "riskProfileId" integer;
    `);

    // Backfill riskProfileId từ risk_profiles (nếu có)
    await queryRunner.query(`
      UPDATE risk_control_matrix rcm
      SET "riskProfileId" = rp.id
      FROM risk_profiles rp
      WHERE rcm."riskProfileId" IS NULL
        AND (
          LOWER(TRIM(rcm."riskName")) = LOWER(TRIM(rp."riskL2"))
          OR LOWER(TRIM(rcm."riskName")) = LOWER(TRIM(rp."riskL1"))
        );
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 5: RISK REGISTER CHUẨN HÓA THEO RBIA
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_registers (
        id SERIAL PRIMARY KEY,
        "auditUniverseId" integer,
        "auditObjectId" integer,
        "riskProfileId" integer,
        "riskControlMatrixId" integer,
        "assessmentYear" integer DEFAULT 2026,
        "contextDescription" text,
        "hsrrCode" character varying,
        "domain" character varying,
        "sequenceNo" character varying,
        "riskCategory" character varying,
        "riskTitle" character varying,
        "riskDescription" text,
        "impactAssessment" text,
        "likelihoodAssessment" text,
        "impactScore" float,
        "likelihoodScore" float,
        "inherentRiskScore" float,
        "inherentRiskLevel" character varying,
        "controlObjective" text,
        "controlMeasures" text,
        "controlCriteria" text,
        "designEffectiveness" float,
        "operatingEffectiveness" float,
        "controlRating" character varying,
        "residualLikelihood" float,
        "residualImpact" float,
        "residualRiskScore" float,
        "finalRiskBand" character varying,
        "riskResponse" character varying,
        "actionPlan" text,
        "targetDate" date,
        "responsibleUnit" character varying,
        "riskOwnerId" integer,
        "riskOwnerName" character varying,
        "relatedIssueIds" text,
        "relatedRcmIds" text,
        "status" character varying DEFAULT 'Active',
        "customFields" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );

      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS "auditUniverseId" integer;
      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS "riskProfileId" integer;
      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS "riskControlMatrixId" integer;
      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS "assessmentYear" integer DEFAULT 2026;
      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS "contextDescription" text;
    `);

    // Backfill auditUniverseId từ auditObjectId
    await queryRunner.query(`
      UPDATE risk_registers
      SET "auditUniverseId" = "auditObjectId"
      WHERE "auditUniverseId" IS NULL AND "auditObjectId" IS NOT NULL;
    `);

    // Backfill riskProfileId từ hsrrCode hoặc domain
    await queryRunner.query(`
      UPDATE risk_registers rr
      SET "riskProfileId" = rp.id
      FROM risk_profiles rp
      WHERE rr."riskProfileId" IS NULL
        AND (
          rr."hsrrCode" = rp."profileCode"
          OR LOWER(TRIM(rr.domain)) = LOWER(TRIM(rp."domainName"))
        );
    `);

    // Gán assessmentYear mặc định cho các bản ghi cũ
    await queryRunner.query(`
      UPDATE risk_registers
      SET "assessmentYear" = 2026
      WHERE "assessmentYear" IS NULL;
    `);

    // Tạo chỉ mục phục vụ truy vấn theo chu trình
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rr_universe_year" ON risk_registers("auditUniverseId", "assessmentYear");
      CREATE INDEX IF NOT EXISTS "IDX_rr_profile" ON risk_registers("riskProfileId");
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 6: RISK ASSESSMENT & RISK ASSESSMENT SCORES (BẢNG CON)
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS risk_assessment_scores (
        id SERIAL PRIMARY KEY,
        "assessmentId" integer NOT NULL,
        "criterionId" integer,
        "criterionName" varchar(255),
        weight float DEFAULT 0,
        score float DEFAULT 3,
        "weightedScore" float DEFAULT 0,
        notes text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_ra_scores_assessment" FOREIGN KEY ("assessmentId") REFERENCES risk_assessments(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_ra_scores_assessment_criterion" ON risk_assessment_scores("assessmentId", "criterionId");
    `);

    await queryRunner.query(`
      ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
      ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS "criteriaVersionId" integer;
    `);

    // Backfill điểm số từ criteriaScores JSON vào risk_assessment_scores
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        score_elem jsonb;
      BEGIN
        FOR r IN SELECT id, "criteriaScores" FROM risk_assessments WHERE "criteriaScores" IS NOT NULL LOOP
          BEGIN
            FOR score_elem IN SELECT jsonb_array_elements(r."criteriaScores"::jsonb) LOOP
              INSERT INTO risk_assessment_scores ("assessmentId", "criterionId", "criterionName", weight, score, "weightedScore", notes)
              VALUES (
                r.id,
                (score_elem->>'criteriaId')::integer,
                score_elem->>'criteriaName',
                COALESCE((score_elem->>'weight')::float, 0),
                COALESCE((score_elem->>'score')::float, 3),
                COALESCE((score_elem->>'weightedScore')::float, 0),
                score_elem->>'note'
              );
            END LOOP;
          EXCEPTION WHEN OTHERS THEN
            -- Bỏ qua nếu dữ liệu JSON cũ không đúng định dạng
            NULL;
          END;
        END LOOP;
      END $$;
    `);

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 7: AUDIT PLAN & AUDIT PLAN UNIT (LOẠI BỎ selectedUnits JSON)
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      ALTER TABLE audit_plan_units ADD COLUMN IF NOT EXISTS "assessmentId" integer;
    `);

    // Backfill assessmentId từ risk_assessments trùng năm và auditUniverse
    await queryRunner.query(`
      UPDATE audit_plan_units apu
      SET "assessmentId" = ra.id
      FROM audit_plans ap, risk_assessments ra
      WHERE apu."planId" = ap.id
        AND apu."universeId" = ra."auditUniverseId"
        AND ap.year = ra."assessmentYear"
        AND apu."assessmentId" IS NULL;
    `);

    // Drop selectedUnits JSON khỏi audit_plans
    const hasSelectedUnitsCol = await queryRunner.hasColumn('audit_plans', 'selectedUnits');
    if (hasSelectedUnitsCol) {
      await queryRunner.query(`ALTER TABLE audit_plans DROP COLUMN "selectedUnits";`);
    }

    // ══════════════════════════════════════════════════════════════
    // BƯỚC 8: RESOURCE DEMAND LIÊN KẾT PLAN UNIT
    // ══════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resource_demands (
        id SERIAL PRIMARY KEY,
        "demandId" character varying(50) UNIQUE,
        "planUnitId" integer,
        "planItemId" character varying(50),
        "activityType" character varying(50) DEFAULT 'Audit',
        "engagementName" character varying(255) NOT NULL,
        "quarter" character varying(10) DEFAULT 'Q1',
        "priority" character varying(50) DEFAULT 'High',
        "requiredSkill" character varying(50),
        "minimumSkillLevel" integer DEFAULT 3,
        "requiredGrade" character varying(50),
        "requiredHours" integer DEFAULT 200,
        "dataAnalyticsHours" integer DEFAULT 40,
        "mandatory" character varying(5) DEFAULT 'Y',
        "status" character varying(50) DEFAULT 'Approved',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_resource_demands_quarter" ON resource_demands ("quarter");
      CREATE INDEX IF NOT EXISTS "IDX_resource_demands_planUnitId" ON resource_demands ("planUnitId");

      ALTER TABLE resource_demands ADD COLUMN IF NOT EXISTS "planUnitId" integer;
    `);

    await queryRunner.query(`
      UPDATE resource_demands rd
      SET "planUnitId" = apu.id
      FROM audit_plan_units apu
      WHERE rd."planUnitId" IS NULL
        AND (
          rd."planItemId" = CONCAT('APU-', apu.id)
          OR rd."engagementName" = apu."universeName"
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Khôi phục từ bảng snapshot nếu có yêu cầu rollback
    await queryRunner.query(`
      DROP TABLE IF EXISTS risk_assessment_scores;

      -- Khôi phục cấu trúc ban đầu từ snapshot nếu tồn tại
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_snapshot_departments') THEN
          DROP TABLE IF EXISTS departments CASCADE;
          CREATE TABLE departments AS SELECT * FROM _snapshot_departments;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_snapshot_audit_universe') THEN
          DROP TABLE IF EXISTS audit_universe CASCADE;
          CREATE TABLE audit_universe AS SELECT * FROM _snapshot_audit_universe;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_snapshot_audit_plans') THEN
          DROP TABLE IF EXISTS audit_plans CASCADE;
          CREATE TABLE audit_plans AS SELECT * FROM _snapshot_audit_plans;
        END IF;
      END $$;
    `);
  }
}
