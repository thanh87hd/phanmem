const { Client } = require('pg');

async function syncSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://ktnb:ktnb@2026@localhost:5432/ktnb_db',
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  const queries = [
    // risk_assessments missing columns
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "adjustedResidualScore" double precision;`,
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "isRecurring" boolean DEFAULT false;`,
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "isOverdueCritical" boolean DEFAULT false;`,
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "isEmergingRisk" boolean DEFAULT false;`,
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "modifierScore" double precision;`,
    `ALTER TABLE "risk_assessments" ADD COLUMN IF NOT EXISTS "totalWeight" double precision DEFAULT 0;`,

    // audit_minutes missing columns
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "minuteType" character varying DEFAULT 'MB04_MERGED';`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "postalRepresentative" text;`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "meetingLocation" character varying;`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "unitRepresentativesText" text;`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "auditeeFeedback" text;`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "commitmentNotes" text;`,
    `ALTER TABLE "audit_minutes" ADD COLUMN IF NOT EXISTS "leadReviewCount" integer DEFAULT 0;`,

    // IIA Standard 15.1: Conformance Statement
    `ALTER TABLE "audit_reports" ADD COLUMN IF NOT EXISTS "conformanceStatement" text DEFAULT 'Cuộc kiểm toán này được thực hiện tuân thủ đầy đủ theo Bộ Chuẩn mực Thực hành Chuyên môn Quốc tế về Kiểm toán Nội bộ (IIA Global Internal Audit Standards 2024) và Thông tư 13/2018/TT-NHNN.';`,
    `ALTER TABLE "audit_reports" ADD COLUMN IF NOT EXISTS "hasNonConformance" boolean DEFAULT false;`,
    `ALTER TABLE "audit_reports" ADD COLUMN IF NOT EXISTS "nonConformanceDetails" text;`,

    // IIA Standard 1.2: Independence CAE Approval
    `ALTER TABLE "conflict_declarations" ADD COLUMN IF NOT EXISTS "caeApprovalStatus" character varying DEFAULT 'None';`,
    `ALTER TABLE "conflict_declarations" ADD COLUMN IF NOT EXISTS "caeApprovedById" integer;`,
    `ALTER TABLE "conflict_declarations" ADD COLUMN IF NOT EXISTS "caeApprovedByName" character varying;`,
    `ALTER TABLE "conflict_declarations" ADD COLUMN IF NOT EXISTS "caeApprovedAt" timestamp;`,
    `ALTER TABLE "conflict_declarations" ADD COLUMN IF NOT EXISTS "caeNotes" text;`,

    // IIA Standard 7.3: Risk Acceptance
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceStatus" character varying DEFAULT 'NotRequested';`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceReason" text;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedById" integer;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedByName" character varying;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceRequestedAt" timestamp;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedById" integer;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedByName" character varying;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceApprovedAt" timestamp;`,
    `ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "riskAcceptanceNotes" text;`,

    // IIA Standard 4.2: Training CPE & Ethics
    `ALTER TABLE "training_records" ADD COLUMN IF NOT EXISTS "certificationType" character varying DEFAULT 'None';`,
    `ALTER TABLE "training_records" ADD COLUMN IF NOT EXISTS "ethicsHours" numeric(4,1) DEFAULT 0;`,
    `ALTER TABLE "training_records" ADD COLUMN IF NOT EXISTS "isVerified" boolean DEFAULT false;`,
    `ALTER TABLE "training_records" ADD COLUMN IF NOT EXISTS "verifiedAt" timestamp;`,

    // Table: iqa_assessments
    `CREATE TABLE IF NOT EXISTS "iqa_assessments" (
      "id" SERIAL PRIMARY KEY,
      "title" character varying NOT NULL,
      "assessmentYear" integer NOT NULL,
      "assessmentPeriod" character varying,
      "engagementId" integer,
      "engagementName" character varying,
      "assessorId" integer,
      "assessorName" character varying,
      "criteria" jsonb,
      "overallScore" double precision,
      "conformityLevel" character varying DEFAULT 'Generally Conforms',
      "strengths" text,
      "areasForImprovement" text,
      "actionItems" jsonb,
      "wpFirstTimeApprovalRate" double precision,
      "avgReworkCount" double precision,
      "budgetVariance" double precision,
      "timelinessRate" double precision,
      "status" character varying DEFAULT 'Draft',
      "createdAt" timestamp DEFAULT now(),
      "updatedAt" timestamp DEFAULT now()
    );`,

    // Table: ia_strategic_plans
    `CREATE TABLE IF NOT EXISTS "ia_strategic_plans" (
      "id" SERIAL PRIMARY KEY,
      "title" character varying NOT NULL,
      "vision" text,
      "mission" text,
      "startYear" integer NOT NULL,
      "endYear" integer NOT NULL,
      "strategicObjectives" jsonb,
      "keyInitiatives" jsonb,
      "kpis" jsonb,
      "status" character varying DEFAULT 'Draft',
      "preparedById" integer,
      "preparedByName" character varying,
      "approvedById" integer,
      "approvedByName" character varying,
      "approvedAt" timestamp,
      "approvalNotes" text,
      "reviewHistory" jsonb DEFAULT '[]',
      "createdAt" timestamp DEFAULT now(),
      "updatedAt" timestamp DEFAULT now()
    );`,

    // Table: report_distributions
    `CREATE TABLE IF NOT EXISTS "report_distributions" (
      "id" SERIAL PRIMARY KEY,
      "reportId" integer NOT NULL,
      "recipientUserId" integer,
      "recipientName" character varying NOT NULL,
      "recipientEmail" character varying,
      "recipientRole" character varying DEFAULT 'AuditeeHead',
      "organizationUnit" character varying,
      "status" character varying DEFAULT 'Sent',
      "distributionChannel" character varying DEFAULT 'SystemPortal',
      "sentAt" timestamp DEFAULT now(),
      "readAt" timestamp,
      "acknowledgedAt" timestamp,
      "acknowledgementNotes" text,
      "updatedAt" timestamp DEFAULT now()
    );`,

    // Table: annual_control_assessments
    `CREATE TABLE IF NOT EXISTS "annual_control_assessments" (
      "id" SERIAL PRIMARY KEY,
      "year" integer UNIQUE NOT NULL,
      "title" character varying NOT NULL,
      "overallOpinion" character varying DEFAULT 'Effective',
      "scopeCoverage" double precision DEFAULT 95.0,
      "cosoControlEnvironment" text,
      "cosoRiskAssessment" text,
      "cosoControlActivities" text,
      "cosoInformationCommunication" text,
      "cosoMonitoring" text,
      "keyDeficienciesSummary" text,
      "strategicRecommendations" text,
      "status" character varying DEFAULT 'Draft',
      "preparedById" integer,
      "preparedByName" character varying,
      "approvedByBksId" integer,
      "approvedByBksName" character varying,
      "approvedByBksAt" timestamp,
      "bksOpinionNotes" text,
      "createdAt" timestamp DEFAULT now(),
      "updatedAt" timestamp DEFAULT now()
    );`,

    // Table: executive_sessions
    `CREATE TABLE IF NOT EXISTS "executive_sessions" (
      "id" SERIAL PRIMARY KEY,
      "title" character varying NOT NULL,
      "meetingDate" date NOT NULL,
      "year" integer NOT NULL,
      "attendees" text,
      "hasManagementPresent" boolean DEFAULT false,
      "confidentialTopics" jsonb,
      "scopeLimitationsDisclosed" text,
      "actionItems" jsonb,
      "status" character varying DEFAULT 'Scheduled',
      "minutesSummary" text,
      "recordedById" integer,
      "recordedByName" character varying,
      "createdAt" timestamp DEFAULT now(),
      "updatedAt" timestamp DEFAULT now()
    );`,

    // Table: external_assurance_coordinations
    `CREATE TABLE IF NOT EXISTS "external_assurance_coordinations" (
      "id" SERIAL PRIMARY KEY,
      "partyType" character varying DEFAULT 'ExternalAuditor',
      "partyName" character varying NOT NULL,
      "auditYear" integer NOT NULL,
      "engagementTitle" character varying NOT NULL,
      "sharedScope" text,
      "workPapersShared" text,
      "relianceLevel" character varying DEFAULT 'Moderate',
      "overlapReductionAreas" text,
      "keyFindingsSharedByExternal" text,
      "status" character varying DEFAULT 'Active',
      "createdAt" timestamp DEFAULT now(),
      "updatedAt" timestamp DEFAULT now()
    );`,
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log('Executed successfully:', q.trim());
    } catch (err) {
      console.error('Error executing query:', q, err.message);
    }
  }

  await client.end();
  console.log('All missing columns added successfully.');
}

syncSchema().catch(console.error);
