import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncMissingTablesAndColumns1787910000000 implements MigrationInterface {
  name = 'SyncMissingTablesAndColumns1787910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ══════════════════════════════════════════════════════════════
    // PHẦN 1: BỔ SUNG CÁC BẢNG THỰC THỂ CÒN THIẾU TRONG DATABASE
    // ══════════════════════════════════════════════════════════════

    // 1. control_exceptions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "control_exceptions" (
        "id" SERIAL NOT NULL,
        "exceptionId" character varying(50) NOT NULL,
        "testId" character varying(50) NOT NULL,
        "sampleItemId" character varying(100),
        "transactionDate" character varying(50),
        "unitBranch" character varying(100),
        "exceptionDescription" text,
        "criteriaBreached" text,
        "exceptionType" character varying(50) NOT NULL DEFAULT 'Valid',
        "financialExposure" numeric(18,2) NOT NULL DEFAULT '0',
        "customerImpact" character varying(5) NOT NULL DEFAULT 'N',
        "regulatoryImpact" character varying(5) NOT NULL DEFAULT 'N',
        "managementExplanation" text,
        "auditorValidation" text,
        "rootCauseCode" character varying(50),
        "riskImpact" text,
        "validException" character varying(5) NOT NULL DEFAULT 'Y',
        "issueId" character varying(50),
        "evidenceRef" character varying(255),
        "preparedBy" character varying(100),
        "reviewStatus" character varying(50) NOT NULL DEFAULT 'Draft',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_control_exceptions_exceptionId" UNIQUE ("exceptionId"),
        CONSTRAINT "PK_control_exceptions_id" PRIMARY KEY ("id")
      );
    `);

    // 2. tests_of_control
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tests_of_control" (
        "id" SERIAL NOT NULL,
        "testId" character varying(50) NOT NULL,
        "engagementId" character varying(50),
        "auditObjectId" character varying(50),
        "riskId" character varying(50),
        "rcmId" character varying(50),
        "controlId" character varying(50),
        "controlDescription" text,
        "keyControl" character varying(5) NOT NULL DEFAULT 'Y',
        "controlOwner" character varying(100),
        "controlFrequency" character varying(50),
        "testPhase" character varying(50) NOT NULL DEFAULT 'Both',
        "testObjective" text,
        "assertion" text,
        "criteria" text,
        "testMethod" character varying(100),
        "dataSource" character varying(255),
        "populationDefinition" text,
        "populationPeriodFrom" character varying(50),
        "populationPeriodTo" character varying(50),
        "populationSize" integer NOT NULL DEFAULT '0',
        "completenessChecked" character varying(5) NOT NULL DEFAULT 'Y',
        "accuracyChecked" character varying(5) NOT NULL DEFAULT 'Y',
        "samplingMethod" character varying(50) NOT NULL DEFAULT 'Statistical',
        "sampleRationale" text,
        "plannedSampleSize" integer NOT NULL DEFAULT '0',
        "actualSampleSize" integer NOT NULL DEFAULT '0',
        "itemsTested" integer NOT NULL DEFAULT '0',
        "validExceptions" integer NOT NULL DEFAULT '0',
        "falsePositives" integer NOT NULL DEFAULT '0',
        "dataIssues" integer NOT NULL DEFAULT '0',
        "exceptionRate" double precision NOT NULL DEFAULT '0',
        "tolerableRate" double precision NOT NULL DEFAULT '0.05',
        "materialException" character varying(5) NOT NULL DEFAULT 'N',
        "pervasiveException" character varying(5) NOT NULL DEFAULT 'N',
        "suggestedResult" character varying(20) NOT NULL DEFAULT 'Pass',
        "finalResult" character varying(20) NOT NULL DEFAULT 'Pass',
        "overrideRationale" text,
        "exceptionSummary" text,
        "rootCauseAssessment" text,
        "riskImpactAssessment" text,
        "issueRequired" character varying(5) NOT NULL DEFAULT 'N',
        "issueId" character varying(50),
        "evidenceReferences" text,
        "preparedBy" character varying(100),
        "preparedDate" character varying(50),
        "reviewedBy" character varying(100),
        "reviewedDate" character varying(50),
        "reviewNotes" text,
        "testStatus" character varying(50) NOT NULL DEFAULT 'Draft',
        "qaFlag" character varying(50),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tests_of_control_testId" UNIQUE ("testId"),
        CONSTRAINT "PK_tests_of_control_id" PRIMARY KEY ("id")
      );
    `);

    // 3. scenario_registers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scenario_registers" (
        "id" SERIAL NOT NULL,
        "scenarioId" character varying(50) NOT NULL,
        "scenarioName" character varying(255) NOT NULL,
        "scenarioType" character varying(50) NOT NULL DEFAULT 'Baseline',
        "horizon" character varying(50) NOT NULL DEFAULT 'Short-term',
        "description" text,
        "keyAssumptions" text,
        "triggerIndicators" text,
        "probabilityPct" double precision NOT NULL DEFAULT '0.5',
        "severity" integer NOT NULL DEFAULT '2',
        "affectedDomains" text,
        "scenarioOwner" character varying(100),
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_scenario_registers_scenarioId" UNIQUE ("scenarioId"),
        CONSTRAINT "PK_scenario_registers_id" PRIMARY KEY ("id")
      );
    `);

    // 4. risk_scenario_analyses
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "risk_scenario_analyses" (
        "id" SERIAL NOT NULL,
        "analysisId" character varying(50) NOT NULL,
        "scenarioId" character varying(50) NOT NULL,
        "riskId" character varying(50) NOT NULL,
        "auditObjectId" character varying(50),
        "riskName" character varying(255) NOT NULL,
        "riskDomain" character varying(50),
        "riskOwner" character varying(100),
        "materialityExposure" double precision NOT NULL DEFAULT '0',
        "baseImpact" double precision NOT NULL DEFAULT '2',
        "baseLikelihood" double precision NOT NULL DEFAULT '2',
        "baseResidualScore" double precision NOT NULL DEFAULT '4',
        "scenarioImpact" double precision NOT NULL DEFAULT '3',
        "scenarioLikelihood" double precision NOT NULL DEFAULT '3',
        "scenarioResidualScore" double precision NOT NULL DEFAULT '9',
        "deltaResidual" double precision NOT NULL DEFAULT '5',
        "riskTrajectory" character varying(50) NOT NULL DEFAULT 'Stable',
        "appetiteThreshold" double precision NOT NULL DEFAULT '12',
        "isAboveAppetite" boolean NOT NULL DEFAULT false,
        "finalBand" character varying(50) NOT NULL DEFAULT 'Medium',
        "auditResponse" character varying(100) NOT NULL DEFAULT 'Monitor KRI',
        "annualPlanImpact" character varying(255),
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_risk_scenario_analyses_analysisId" UNIQUE ("analysisId"),
        CONSTRAINT "PK_risk_scenario_analyses_id" PRIMARY KEY ("id")
      );
    `);

    // 5. staff_rosters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_rosters" (
        "id" SERIAL NOT NULL,
        "staffId" character varying(50) NOT NULL,
        "fullName" character varying(100) NOT NULL,
        "grade" character varying(50) NOT NULL DEFAULT 'Senior',
        "department" character varying(100),
        "manager" character varying(100),
        "employmentStatus" character varying(50) NOT NULL DEFAULT 'Active',
        "fte" double precision NOT NULL DEFAULT '1',
        "primarySkill" character varying(50),
        "secondarySkills" character varying(255),
        "skillLevel" integer NOT NULL DEFAULT '3',
        "dataAnalyticsLevel" integer NOT NULL DEFAULT '2',
        "certifications" character varying(255),
        "location" character varying(100) NOT NULL DEFAULT 'Hội sở',
        "annualStandardHours" integer NOT NULL DEFAULT '1760',
        "plannedLeaveHours" integer NOT NULL DEFAULT '160',
        "trainingHours" integer NOT NULL DEFAULT '80',
        "adminHours" integer NOT NULL DEFAULT '120',
        "qaHours" integer NOT NULL DEFAULT '80',
        "contingencyHours" integer NOT NULL DEFAULT '120',
        "netAvailableHours" integer NOT NULL DEFAULT '1200',
        "committedHours" integer NOT NULL DEFAULT '0',
        "remainingCapacity" integer NOT NULL DEFAULT '1200',
        "utilizationPct" double precision NOT NULL DEFAULT '0',
        "skillGapFlag" character varying(50),
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_staff_rosters_staffId" UNIQUE ("staffId"),
        CONSTRAINT "PK_staff_rosters_id" PRIMARY KEY ("id")
      );
    `);

    // 6. resource_allocations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "resource_allocations" (
        "id" SERIAL NOT NULL,
        "allocationId" character varying(50) NOT NULL,
        "demandId" character varying(50) NOT NULL,
        "planItemId" character varying(50),
        "staffId" character varying(50) NOT NULL,
        "staffName" character varying(100) NOT NULL,
        "quarter" character varying(10) NOT NULL DEFAULT 'Q1',
        "role" character varying(50),
        "assignedSkill" character varying(50),
        "allocatedHours" integer NOT NULL DEFAULT '100',
        "overlapConflict" boolean NOT NULL DEFAULT false,
        "status" character varying(50) NOT NULL DEFAULT 'Allocated',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_resource_allocations_allocationId" UNIQUE ("allocationId"),
        CONSTRAINT "PK_resource_allocations_id" PRIMARY KEY ("id")
      );
    `);

    // 7. raci_assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "raci_assignments" (
        "id" SERIAL NOT NULL,
        "assignmentId" character varying(50) NOT NULL,
        "processId" character varying(50) NOT NULL,
        "activityId" character varying(50) NOT NULL,
        "activityName" character varying(255),
        "roleId" character varying(50) NOT NULL,
        "roleName" character varying(100) NOT NULL,
        "raciCode" character varying(5) NOT NULL,
        "responsibilityScope" text,
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_raci_assignments_assignmentId" UNIQUE ("assignmentId"),
        CONSTRAINT "PK_raci_assignments_id" PRIMARY KEY ("id")
      );
    `);

    // 8. process_activities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_activities" (
        "id" SERIAL NOT NULL,
        "activityId" character varying(50) NOT NULL,
        "processId" character varying(50) NOT NULL,
        "stepNo" integer NOT NULL DEFAULT '1',
        "activityName" character varying(255) NOT NULL,
        "activityType" character varying(50) NOT NULL DEFAULT 'Execution',
        "description" text,
        "inputDesc" text,
        "outputDesc" text,
        "decisionAuthority" character varying(100),
        "sla" character varying(100),
        "keyControl" text,
        "criticality" character varying(50) NOT NULL DEFAULT 'Medium',
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_process_activities_activityId" UNIQUE ("activityId"),
        CONSTRAINT "PK_process_activities_id" PRIMARY KEY ("id")
      );
    `);

    // 9. audit_processes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_processes" (
        "id" SERIAL NOT NULL,
        "processId" character varying(50) NOT NULL,
        "processName" character varying(255) NOT NULL,
        "processType" character varying(50) NOT NULL DEFAULT 'Core Assurance',
        "objective" text,
        "scope" text,
        "processOwner" character varying(100),
        "executiveOwner" character varying(100),
        "criticality" character varying(50) NOT NULL DEFAULT 'High',
        "version" character varying(20) NOT NULL DEFAULT '2.0',
        "status" character varying(50) NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_audit_processes_processId" UNIQUE ("processId"),
        CONSTRAINT "PK_audit_processes_id" PRIMARY KEY ("id")
      );
    `);

    // 10. iqa_assessments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "iqa_assessments" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "assessmentYear" integer NOT NULL,
        "assessmentPeriod" character varying,
        "engagementId" integer,
        "engagementName" character varying,
        "assessorId" integer,
        "assessorName" character varying,
        "criteria" jsonb,
        "overallScore" double precision,
        "conformityLevel" character varying NOT NULL DEFAULT 'Generally Conforms',
        "strengths" text,
        "areasForImprovement" text,
        "actionItems" jsonb,
        "wpFirstTimeApprovalRate" double precision,
        "avgReworkCount" double precision,
        "budgetVariance" double precision,
        "timelinessRate" double precision,
        "status" character varying NOT NULL DEFAULT 'Draft',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_iqa_assessments_id" PRIMARY KEY ("id")
      );
    `);

    // 11. ia_strategic_plans
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ia_strategic_plans" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "startYear" integer NOT NULL,
        "endYear" integer NOT NULL,
        "vision" text NOT NULL,
        "mission" text NOT NULL,
        "strategicObjectives" text,
        "keyInitiatives" jsonb,
        "resourceRequirements" text,
        "riskCoverage" text,
        "technologyStrategy" text,
        "stakeholderExpectations" text,
        "status" character varying NOT NULL DEFAULT 'Draft',
        "preparedById" integer,
        "preparedByName" character varying,
        "approvedById" integer,
        "approvedByName" character varying,
        "approvedAt" TIMESTAMP,
        "approvalNotes" text,
        "reviewHistory" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ia_strategic_plans_id" PRIMARY KEY ("id")
      );
    `);

    // 12. report_distributions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_distributions" (
        "id" SERIAL NOT NULL,
        "reportId" integer NOT NULL,
        "recipientUserId" integer,
        "recipientName" character varying NOT NULL,
        "recipientEmail" character varying,
        "recipientRole" character varying NOT NULL DEFAULT 'AuditeeHead',
        "organizationUnit" character varying,
        "status" character varying NOT NULL DEFAULT 'Sent',
        "distributionChannel" character varying NOT NULL DEFAULT 'SystemPortal',
        "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
        "readAt" TIMESTAMP,
        "acknowledgedAt" TIMESTAMP,
        "acknowledgementNotes" text,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_report_distributions_id" PRIMARY KEY ("id")
      );
    `);

    // 13. audit_ratings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_ratings" (
        "id" SERIAL NOT NULL,
        "ratingCode" character varying(50) NOT NULL,
        "engagementId" character varying(50),
        "auditObjectId" character varying(50),
        "engagementTitle" character varying(255),
        "auditType" character varying(50) NOT NULL DEFAULT 'Assurance',
        "coverageGapPct" double precision NOT NULL DEFAULT '0',
        "residualRiskScore" double precision NOT NULL DEFAULT '2',
        "controlEffectivenessScore" double precision NOT NULL DEFAULT '2',
        "criticalIssuesCount" integer NOT NULL DEFAULT '0',
        "highIssuesCount" integer NOT NULL DEFAULT '0',
        "moderateIssuesCount" integer NOT NULL DEFAULT '0',
        "lowIssuesCount" integer NOT NULL DEFAULT '0',
        "issueSeverityScore" double precision NOT NULL DEFAULT '2',
        "managementResponseScore" double precision NOT NULL DEFAULT '2',
        "scopeLimitation" character varying(50) NOT NULL DEFAULT 'None',
        "baseWeightedScore" double precision NOT NULL DEFAULT '2',
        "calculatedRating" character varying(50) NOT NULL,
        "decisionRuleRating" character varying(50),
        "decisionRuleRationale" text,
        "finalRating" character varying(50) NOT NULL,
        "overrideRationale" text,
        "overallConclusion" text,
        "keyStrengths" text,
        "keyWeaknesses" text,
        "status" character varying(50) NOT NULL DEFAULT 'Draft',
        "preparedBy" character varying(100),
        "reviewedBy" character varying(100),
        "approvedBy" character varying(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_audit_ratings_ratingCode" UNIQUE ("ratingCode"),
        CONSTRAINT "PK_audit_ratings_id" PRIMARY KEY ("id")
      );
    `);

    // 14. external_assurance_coordinations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "external_assurance_coordinations" (
        "id" SERIAL NOT NULL,
        "partyType" character varying NOT NULL DEFAULT 'ExternalAuditor',
        "partyName" character varying NOT NULL,
        "auditYear" integer NOT NULL,
        "engagementTitle" character varying NOT NULL,
        "sharedScope" text,
        "workPapersShared" text,
        "relianceLevel" character varying NOT NULL DEFAULT 'Moderate',
        "overlapReductionAreas" text,
        "keyFindingsSharedByExternal" text,
        "status" character varying NOT NULL DEFAULT 'Active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_external_assurance_coordinations_id" PRIMARY KEY ("id")
      );
    `);

    // 15. executive_sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "executive_sessions" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "meetingDate" date NOT NULL,
        "year" integer NOT NULL,
        "attendees" text,
        "hasManagementPresent" boolean NOT NULL DEFAULT false,
        "confidentialTopics" jsonb,
        "scopeLimitationsDisclosed" text,
        "actionItems" jsonb,
        "status" character varying NOT NULL DEFAULT 'Scheduled',
        "minutesSummary" text,
        "recordedById" integer,
        "recordedByName" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_executive_sessions_id" PRIMARY KEY ("id")
      );
    `);

    // 16. annual_control_assessments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annual_control_assessments" (
        "id" SERIAL NOT NULL,
        "year" integer NOT NULL,
        "title" character varying NOT NULL,
        "overallOpinion" character varying NOT NULL DEFAULT 'Effective',
        "scopeCoverage" double precision NOT NULL DEFAULT '95',
        "cosoControlEnvironment" text,
        "cosoRiskAssessment" text,
        "cosoControlActivities" text,
        "cosoInformationCommunication" text,
        "cosoMonitoring" text,
        "keyDeficienciesSummary" text,
        "strategicRecommendations" text,
        "status" character varying NOT NULL DEFAULT 'Draft',
        "preparedById" integer,
        "preparedByName" character varying,
        "approvedByBksId" integer,
        "approvedByBksName" character varying,
        "approvedByBksAt" TIMESTAMP,
        "bksOpinionNotes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_annual_control_assessments_year" UNIQUE ("year"),
        CONSTRAINT "PK_annual_control_assessments_id" PRIMARY KEY ("id")
      );
    `);

    // ══════════════════════════════════════════════════════════════
    // PHẦN 2: BỔ SUNG CÁC CỘT THỰC THỂ CÒN THIẾU TRÊN BẢNG HIỆN CÓ
    // ══════════════════════════════════════════════════════════════

    // 1. risk_assessments
    await queryRunner.query(`
      ALTER TABLE "risk_assessments"
        ADD COLUMN IF NOT EXISTS "designEffectiveness" double precision,
        ADD COLUMN IF NOT EXISTS "operatingEffectiveness" double precision,
        ADD COLUMN IF NOT EXISTS "impactScores" text,
        ADD COLUMN IF NOT EXISTS "likelihoodScores" text,
        ADD COLUMN IF NOT EXISTS "adjustedResidualScore" double precision,
        ADD COLUMN IF NOT EXISTS "isRecurring" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isOverdueCritical" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isEmergingRisk" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "modifierScore" double precision;
    `);

    // 2. audit_plan_units
    await queryRunner.query(`
      ALTER TABLE "audit_plan_units"
        ADD COLUMN IF NOT EXISTS "auditCategory" character varying,
        ADD COLUMN IF NOT EXISTS "totalScore" double precision,
        ADD COLUMN IF NOT EXISTS "notes" text;
    `);

    // 3. working_papers
    await queryRunner.query(`
      ALTER TABLE "working_papers"
        ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
    `);

    // 4. training_records
    await queryRunner.query(`
      ALTER TABLE "training_records"
        ADD COLUMN IF NOT EXISTS "certificationType" character varying,
        ADD COLUMN IF NOT EXISTS "ethicsHours" decimal,
        ADD COLUMN IF NOT EXISTS "isVerified" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP;
    `);

    // 5. audit_findings
    await queryRunner.query(`
      ALTER TABLE "audit_findings"
        ADD COLUMN IF NOT EXISTS "repeatCount" integer DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "themeId" character varying,
        ADD COLUMN IF NOT EXISTS "riskRegisterId" integer,
        ADD COLUMN IF NOT EXISTS "financialExposure" numeric,
        ADD COLUMN IF NOT EXISTS "agingBucket" character varying,
        ADD COLUMN IF NOT EXISTS "daysOpen" integer,
        ADD COLUMN IF NOT EXISTS "daysOverdue" integer,
        ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
    `);

    // 6. recommendations
    await queryRunner.query(`
      ALTER TABLE "recommendations"
        ADD COLUMN IF NOT EXISTS "riskAcceptanceStatus" character varying,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceReason" text,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedById" integer,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedByName" character varying,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedById" integer,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedByName" character varying,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "riskAcceptanceNotes" text;
    `);

    // 7. conflict_declarations
    await queryRunner.query(`
      ALTER TABLE "conflict_declarations"
        ADD COLUMN IF NOT EXISTS "caeApprovalStatus" character varying,
        ADD COLUMN IF NOT EXISTS "caeApprovedById" integer,
        ADD COLUMN IF NOT EXISTS "caeApprovedByName" character varying,
        ADD COLUMN IF NOT EXISTS "caeApprovedAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "caeNotes" text;
    `);

    // 8. audit_reports
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
        ADD COLUMN IF NOT EXISTS "conformanceStatement" text,
        ADD COLUMN IF NOT EXISTS "hasNonConformance" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "nonConformanceDetails" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không bắt buộc drop bừa bãi để giữ toàn vẹn dữ liệu
  }
}
