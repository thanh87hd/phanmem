import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SampleType,
  SamplingMethod,
} from '../entities/audit-sample-batch.entity';
import { TestResult } from '../entities/audit-sample.entity';

// ═══ BATCH DTOs ═══

export class CreateSampleBatchDto {
  @IsString()
  @IsNotEmpty()
  batchName: string;

  @IsEnum(SampleType)
  @IsOptional()
  sampleType?: SampleType;

  @IsEnum(SamplingMethod)
  @IsOptional()
  samplingMethod?: SamplingMethod;

  @IsNumber()
  @IsOptional()
  populationSize?: number;

  @IsNumber()
  @IsOptional()
  sampleSize?: number;

  @IsNumber()
  @IsOptional()
  confidenceLevel?: number;

  @IsNumber()
  @IsOptional()
  tolerableError?: number;

  @IsString()
  @IsOptional()
  populationSource?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  engagementId?: number;

  @IsNumber()
  @IsOptional()
  workingPaperId?: number;

  @IsString()
  @IsOptional()
  auditDomain?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  assignedAuditorId?: number;

  @IsString()
  @IsOptional()
  assignedAuditorName?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  controlEffectiveness?: string;

  @IsString()
  @IsOptional()
  controlConclusion?: string;
}

export class UpdateSampleBatchDto {
  @IsString()
  @IsOptional()
  batchName?: string;

  @IsString()
  @IsOptional()
  auditDomain?: string;

  @IsEnum(SampleType)
  @IsOptional()
  sampleType?: SampleType;

  @IsEnum(SamplingMethod)
  @IsOptional()
  samplingMethod?: SamplingMethod;

  @IsNumber()
  @IsOptional()
  populationSize?: number;

  @IsNumber()
  @IsOptional()
  sampleSize?: number;

  @IsNumber()
  @IsOptional()
  confidenceLevel?: number;

  @IsNumber()
  @IsOptional()
  tolerableError?: number;

  @IsString()
  @IsOptional()
  populationSource?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  assignedAuditorId?: number;

  @IsString()
  @IsOptional()
  assignedAuditorName?: string;

  @IsNumber()
  @IsOptional()
  workingPaperId?: number;

  @IsString()
  @IsOptional()
  controlEffectiveness?: string;

  @IsString()
  @IsOptional()
  controlConclusion?: string;
}

// ═══ SAMPLE DTOs ═══

export class CreateSampleDto {
  @IsEnum(SampleType)
  @IsOptional()
  sampleType?: SampleType;

  @IsNumber()
  @IsOptional()
  sequenceNo?: number;

  // Detail fields
  @IsString()
  @IsOptional()
  cifOrAccount?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerType?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  managingBranchCode?: string;

  @IsString()
  @IsOptional()
  managingBranchName?: string;

  @IsString()
  @IsOptional()
  operationType?: string;

  @IsString()
  @IsOptional()
  businessProcess?: string;

  @IsString()
  @IsOptional()
  proposerOfficer?: string;

  @IsString()
  @IsOptional()
  appraiserOfficer?: string;

  @IsString()
  @IsOptional()
  businessLeader?: string;

  @IsNumber()
  @IsOptional()
  assignedAuditorId?: number;

  @IsString()
  @IsOptional()
  assignedAuditorName?: string;

  // Control point fields
  @IsString()
  @IsOptional()
  controlPointId?: string;

  @IsString()
  @IsOptional()
  controlDescription?: string;

  @IsString()
  @IsOptional()
  controlFrequency?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsNumber()
  @IsOptional()
  loanAmount?: number;

  @IsString()
  @IsOptional()
  debtGroup?: string;

  @IsString()
  @IsOptional()
  loanPurpose?: string;

  @IsString()
  @IsOptional()
  auditeeOfficer?: string;

  @IsString()
  @IsOptional()
  interviewAuditeeOfficer?: string;

  @IsBoolean()
  @IsOptional()
  fieldInspection?: boolean;

  @IsString()
  @IsOptional()
  fieldInspectionInfo?: string;

  @IsString()
  @IsOptional()
  fieldInspectionResult?: string;

  @IsString()
  @IsOptional()
  preExplanationNote?: string;

  @IsString()
  @IsOptional()
  auditeeExplanation?: string;

  @IsString()
  @IsOptional()
  auditorResponse?: string;

  @IsString()
  @IsOptional()
  postExplanationNote?: string;

  @IsString()
  @IsOptional()
  riskGroup?: string;

  @IsString()
  @IsOptional()
  riskCategory?: string;

  @IsString()
  @IsOptional()
  detailedRisk?: string;

  @IsString()
  @IsOptional()
  violationCause?: string;

  @IsString()
  @IsOptional()
  violationCauseType?: string;

  @IsString()
  @IsOptional()
  inherentRisk?: string;

  @IsString()
  @IsOptional()
  controlQuality?: string;

  @IsString()
  @IsOptional()
  residualRisk?: string;

  @IsString()
  @IsOptional()
  recommendationText?: string;

  @IsString()
  @IsOptional()
  relatedPersonnelText?: string;

  @IsString()
  @IsOptional()
  violationHistory?: string;

  @IsString()
  @IsOptional()
  responsibleDepartment?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  primaryOfficerUnit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer1Unit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer2Unit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer3Unit?: string;

  @IsString()
  @IsOptional()
  primaryOfficerHO?: string;

  @IsString()
  @IsOptional()
  relatedOfficer1HO?: string;

  @IsString()
  @IsOptional()
  relatedOfficer2HO?: string;

  @IsString()
  @IsOptional()
  auditeeOpinion?: string;

  @IsBoolean()
  @IsOptional()
  includeInReport?: boolean;

  // ═══ PTD & REMEDIATION (20 COLUMNS) EXTENDED FIELDS ═══
  @IsString()
  @IsOptional()
  errorCountText?: string;

  @IsString()
  @IsOptional()
  branchDirectorAtViolation?: string;

  @IsBoolean()
  @IsOptional()
  remediationFeasibility?: boolean;

  @IsString()
  @IsOptional()
  remediationUnfeasibleReason?: string;

  @IsString()
  @IsOptional()
  auditeeProposal?: string;

  @IsString()
  @IsOptional()
  remediationApprover?: string;

  @IsString()
  @IsOptional()
  remediationApprovedDate?: string;

  @IsString()
  @IsOptional()
  monitoringCycle?: string;

  @IsString()
  @IsOptional()
  remediationEvidenceLink?: string;

  @IsOptional()
  sampleData?: any;

  @IsOptional()
  sampleAssessments?: any;
}

export class BulkCreateSamplesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSampleDto)
  samples: CreateSampleDto[];
}

export class UpdateSampleDto {
  @IsEnum(TestResult)
  @IsOptional()
  testResult?: TestResult;

  @IsString()
  @IsOptional()
  testNotes?: string;

  @IsString()
  @IsOptional()
  testedBy?: string;

  @IsNumber()
  @IsOptional()
  assignedAuditorId?: number;

  @IsString()
  @IsOptional()
  assignedAuditorName?: string;

  @IsNumber()
  @IsOptional()
  findingId?: number;

  // Allow updating detail fields too
  @IsString()
  @IsOptional()
  cifOrAccount?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerType?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  managingBranchCode?: string;

  @IsString()
  @IsOptional()
  managingBranchName?: string;

  @IsString()
  @IsOptional()
  operationType?: string;

  @IsString()
  @IsOptional()
  businessProcess?: string;

  @IsString()
  @IsOptional()
  proposerOfficer?: string;

  @IsString()
  @IsOptional()
  appraiserOfficer?: string;

  @IsString()
  @IsOptional()
  businessLeader?: string;

  @IsString()
  @IsOptional()
  controlPointId?: string;

  @IsString()
  @IsOptional()
  controlDescription?: string;

  @IsString()
  @IsOptional()
  controlFrequency?: string;

  @IsNumber()
  @IsOptional()
  id?: number;

  @IsNumber()
  @IsOptional()
  sequenceNo?: number;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsNumber()
  @IsOptional()
  loanAmount?: number;

  @IsString()
  @IsOptional()
  debtGroup?: string;

  @IsString()
  @IsOptional()
  loanPurpose?: string;

  @IsString()
  @IsOptional()
  auditeeOfficer?: string;

  @IsString()
  @IsOptional()
  interviewAuditeeOfficer?: string;

  @IsBoolean()
  @IsOptional()
  fieldInspection?: boolean;

  @IsString()
  @IsOptional()
  fieldInspectionInfo?: string;

  @IsString()
  @IsOptional()
  fieldInspectionResult?: string;

  @IsString()
  @IsOptional()
  preExplanationNote?: string;

  @IsString()
  @IsOptional()
  auditeeExplanation?: string;

  @IsString()
  @IsOptional()
  auditorResponse?: string;

  @IsString()
  @IsOptional()
  postExplanationNote?: string;

  @IsString()
  @IsOptional()
  riskGroup?: string;

  @IsString()
  @IsOptional()
  riskCategory?: string;

  @IsString()
  @IsOptional()
  detailedRisk?: string;

  @IsString()
  @IsOptional()
  violationCause?: string;

  @IsString()
  @IsOptional()
  violationCauseType?: string;

  @IsString()
  @IsOptional()
  inherentRisk?: string;

  @IsString()
  @IsOptional()
  controlQuality?: string;

  @IsString()
  @IsOptional()
  residualRisk?: string;

  @IsString()
  @IsOptional()
  recommendationText?: string;

  @IsString()
  @IsOptional()
  relatedPersonnelText?: string;

  @IsString()
  @IsOptional()
  violationHistory?: string;

  @IsString()
  @IsOptional()
  responsibleDepartment?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  primaryOfficerUnit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer1Unit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer2Unit?: string;

  @IsString()
  @IsOptional()
  relatedOfficer3Unit?: string;

  @IsString()
  @IsOptional()
  primaryOfficerHO?: string;

  @IsString()
  @IsOptional()
  relatedOfficer1HO?: string;

  @IsString()
  @IsOptional()
  relatedOfficer2HO?: string;

  @IsString()
  @IsOptional()
  auditeeOpinion?: string;

  @IsBoolean()
  @IsOptional()
  includeInReport?: boolean;

  // ═══ PTD & REMEDIATION (20 COLUMNS) EXTENDED FIELDS ═══
  @IsString()
  @IsOptional()
  errorCountText?: string;

  @IsString()
  @IsOptional()
  branchDirectorAtViolation?: string;

  @IsBoolean()
  @IsOptional()
  remediationFeasibility?: boolean;

  @IsString()
  @IsOptional()
  remediationUnfeasibleReason?: string;

  @IsString()
  @IsOptional()
  auditeeProposal?: string;

  @IsString()
  @IsOptional()
  remediationApprover?: string;

  @IsString()
  @IsOptional()
  remediationApprovedDate?: string;

  @IsString()
  @IsOptional()
  monitoringCycle?: string;

  @IsString()
  @IsOptional()
  remediationEvidenceLink?: string;

  @IsOptional()
  sampleData?: any;

  @IsOptional()
  sampleAssessments?: any;

  // ═══ METADATA & RELATIONS (Allowed in payload, filtered before DB update) ═══
  @IsOptional()
  batch?: any;

  @IsOptional()
  batchId?: number;

  @IsOptional()
  sampleType?: any;

  @IsOptional()
  testedAt?: any;

  @IsOptional()
  finding?: any;

  @IsOptional()
  postalAgencyCode?: string;

  @IsOptional()
  reconciliationCashDiff?: number;

  @IsOptional()
  reportDelayDays?: number;

  @IsOptional()
  userCrossEnv?: string;

  @IsOptional()
  uniVsT24DiffMinutes?: number;

  @IsOptional()
  damagedAcqtSeries?: string;

  @IsOptional()
  negativeAccountBalance?: number;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;
}

export class BulkAssignSamplesDto {
  @IsArray()
  @IsInt({ each: true })
  sampleIds: number[];

  @IsOptional()
  @IsInt()
  assignedAuditorId?: number;

  @IsOptional()
  @IsString()
  assignedAuditorName?: string;
}
