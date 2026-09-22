BEGIN;

-- 1. AddThucteFields1724781000000
ALTER TABLE "audit_engagements"
  ADD COLUMN IF NOT EXISTS "postalDepartmentName" character varying,
  ADD COLUMN IF NOT EXISTS "postalRepresentative" text,
  ADD COLUMN IF NOT EXISTS "recipientList" text;

ALTER TABLE "audit_findings"
  ADD COLUMN IF NOT EXISTS "channel" character varying,
  ADD COLUMN IF NOT EXISTS "findingCategory" character varying,
  ADD COLUMN IF NOT EXISTS "violationHistory" character varying,
  ADD COLUMN IF NOT EXISTS "postalAgencyCode" character varying;

ALTER TABLE "audit_samples"
  ADD COLUMN IF NOT EXISTS "postalAgencyCode" character varying,
  ADD COLUMN IF NOT EXISTS "reconciliationCashDiff" double precision,
  ADD COLUMN IF NOT EXISTS "reportDelayDays" integer,
  ADD COLUMN IF NOT EXISTS "postalProductCode" character varying,
  ADD COLUMN IF NOT EXISTS "postalTransactionType" character varying,
  ADD COLUMN IF NOT EXISTS "userCrossEnv" character varying,
  ADD COLUMN IF NOT EXISTS "damagedAcqtSeries" character varying;

ALTER TABLE "audit_minutes"
  ADD COLUMN IF NOT EXISTS "minuteType" character varying DEFAULT 'MB04_MERGED',
  ADD COLUMN IF NOT EXISTS "postalRepresentative" text;

ALTER TABLE "audit_reports"
  ADD COLUMN IF NOT EXISTS "reportTemplateType" character varying DEFAULT 'MB01B',
  ADD COLUMN IF NOT EXISTS "postalDepartmentName" character varying,
  ADD COLUMN IF NOT EXISTS "vietnamPostRecipient" text;

-- 2. CreateDepartmentHistories1724782000000
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
  CONSTRAINT "PK_department_histories_id" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IDX_dept_hist_dept_year" ON "department_histories" ("departmentId", "periodYear");
CREATE INDEX IF NOT EXISTS "IDX_dept_hist_change_type" ON "department_histories" ("changeType");

-- 3. AddAuditStandardsWorkflowFields1724783000000
ALTER TABLE "audit_universe"
  ADD COLUMN IF NOT EXISTS "transferredFromUniverseId" integer,
  ADD COLUMN IF NOT EXISTS "transferredFromDeptCode" character varying,
  ADD COLUMN IF NOT EXISTS "transferredRiskScore" double precision,
  ADD COLUMN IF NOT EXISTS "transferNotes" text;

ALTER TABLE "audit_engagements"
  ADD COLUMN IF NOT EXISTS "samplingPlanDocUrl" character varying,
  ADD COLUMN IF NOT EXISTS "isOfficialized" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "officializedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "officializedBy" character varying;

ALTER TABLE "audit_sample_batches"
  ADD COLUMN IF NOT EXISTS "assignedAuditorId" integer,
  ADD COLUMN IF NOT EXISTS "assignedAuditorName" character varying,
  ADD COLUMN IF NOT EXISTS "changeStatus" character varying DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS "changeReason" text,
  ADD COLUMN IF NOT EXISTS "changeRequestedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "changeApprovedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "changeApprovedBy" character varying,
  ADD COLUMN IF NOT EXISTS "reportedToDepartmentAt" TIMESTAMP;

ALTER TABLE "audit_minutes"
  ADD COLUMN IF NOT EXISTS "leadReviewCount" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "audit_reports"
  ADD COLUMN IF NOT EXISTS "managerReviewCount" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb;

-- 4. CreateMasterDataChangeRequestsTable1724784000000
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

-- 5. CreateKriBacktestResultsTable1724785000000
DO $$ BEGIN
  CREATE TYPE "public"."kri_backtest_results_strategy_enum" AS ENUM('HISTORICAL_REPLAY', 'WALK_FORWARD', 'MONTE_CARLO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "kri_backtest_results" (
  "id" SERIAL NOT NULL,
  "ruleCode" character varying(100) NOT NULL,
  "ruleName" character varying(255) NOT NULL,
  "strategy" "public"."kri_backtest_results_strategy_enum" NOT NULL DEFAULT 'HISTORICAL_REPLAY',
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "testedThresholds" jsonb NOT NULL,
  "totalObservations" integer NOT NULL DEFAULT 0,
  "truePositives" integer NOT NULL DEFAULT 0,
  "falsePositives" integer NOT NULL DEFAULT 0,
  "trueNegatives" integer NOT NULL DEFAULT 0,
  "falseNegatives" integer NOT NULL DEFAULT 0,
  "hitRateRecall" double precision NOT NULL DEFAULT '0',
  "precision" double precision NOT NULL DEFAULT '0',
  "falsePositiveRate" double precision NOT NULL DEFAULT '0',
  "f1Score" double precision NOT NULL DEFAULT '0',
  "aucRoc" double precision NOT NULL DEFAULT '0',
  "optimalThresholdRecommendation" jsonb,
  "timeSeriesDetails" jsonb,
  "executedBy" character varying,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_kri_backtest_results" PRIMARY KEY ("id")
);

-- 6. AddExtractionMetadata1724786000000
ALTER TABLE regulatory_knowledge_base 
  ADD COLUMN IF NOT EXISTS "pageCount" integer,
  ADD COLUMN IF NOT EXISTS "extractionMethod" varchar,
  ADD COLUMN IF NOT EXISTS "ocrConfidence" float,
  ADD COLUMN IF NOT EXISTS "sourceDocumentId" integer;
ALTER TABLE regulatory_knowledge_base 
  ALTER COLUMN "businessProcess" DROP NOT NULL;
ALTER TABLE regulatory_knowledge_base 
  ALTER COLUMN "businessProcess" SET DEFAULT 'Chung';

-- 7. AddWpReviewHistory1724787000000
ALTER TABLE working_papers 
  ADD COLUMN IF NOT EXISTS "reviewHistory" jsonb DEFAULT '[]'::jsonb;

-- 8. CreateDocumentChunks1724788000000
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    "regulatoryKnowledgeId" INTEGER NOT NULL REFERENCES regulatory_knowledge_base(id) ON DELETE CASCADE,
    "chunkIndex" INTEGER NOT NULL,
    content TEXT NOT NULL,
    heading VARCHAR(500),
    "pageNumber" INTEGER,
    "charCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_reg_id ON document_chunks("regulatoryKnowledgeId");
CREATE INDEX IF NOT EXISTS idx_document_chunks_reg_chunk ON document_chunks("regulatoryKnowledgeId", "chunkIndex");
CREATE INDEX IF NOT EXISTS idx_document_chunks_heading ON document_chunks(heading);

-- 9. CreateRiskProfilesTable1787830680254
CREATE TABLE IF NOT EXISTS "risk_profiles" (
  "id" SERIAL PRIMARY KEY,
  "profileCode" character varying NOT NULL,
  "domainName" character varying NOT NULL,
  "riskCategory" character varying,
  "riskL1" character varying NOT NULL,
  "riskL2" text NOT NULL,
  "impactCriteria" text,
  "likelihoodCriteria" text,
  "controlMeasures" text,
  "controlDesignQuality" character varying,
  "inherentImpact" character varying DEFAULT 'Trung bình',
  "inherentLikelihood" character varying DEFAULT 'Trung bình',
  "inherentRiskLevel" character varying DEFAULT 'Trung bình',
  "controlOperatingEffectiveness" character varying DEFAULT 'Trung bình',
  "residualRiskLevel" character varying DEFAULT 'Trung bình',
  "targetEntity" character varying DEFAULT 'ĐVKD',
  "mappedDefectCodes" jsonb,
  "isActive" boolean DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- TypeORM migrations tracking table
CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL PRIMARY KEY,
  "timestamp" bigint NOT NULL,
  "name" character varying NOT NULL
);

INSERT INTO "migrations" ("timestamp", "name") VALUES
  (1724781000000, 'AddThucteFields1724781000000'),
  (1724782000000, 'CreateDepartmentHistories1724782000000'),
  (1724783000000, 'AddAuditStandardsWorkflowFields1724783000000'),
  (1724784000000, 'CreateMasterDataChangeRequestsTable1724784000000'),
  (1724785000000, 'CreateKriBacktestResultsTable1724785000000'),
  (1724786000000, 'AddExtractionMetadata1724786000000'),
  (1724787000000, 'AddWpReviewHistory1724787000000'),
  (1724788000000, 'CreateDocumentChunks1724788000000'),
  (1787830680254, 'CreateRiskProfilesTable1787830680254')
ON CONFLICT DO NOTHING;

COMMIT;
