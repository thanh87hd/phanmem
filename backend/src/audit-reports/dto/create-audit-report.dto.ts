import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateAuditReportDto {
  @IsString()
  @IsNotEmpty({ message: 'Kế hoạch kiểm toán không được để trống' })
  plan: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề báo cáo không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  executiveSummary?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsString()
  @IsOptional()
  overallConclusion?: string;

  @IsString()
  @IsOptional()
  managementEvaluation?: string;

  @IsString()
  @IsOptional()
  internalControlEvaluation?: string;

  @IsString()
  @IsOptional()
  recommendationsForAuditee?: string;

  @IsString()
  @IsOptional()
  recommendationsForCEO?: string;

  @IsString()
  @IsOptional()
  auditRating?: string;

  @IsNumber()
  @IsOptional()
  engagementId?: number;

  @IsString()
  @IsOptional()
  issuedBy?: string;

  @IsOptional()
  isSigned?: boolean;

  @IsString()
  @IsOptional()
  signatureData?: string;

  @IsOptional()
  signedAt?: Date;

  @IsString()
  @IsOptional()
  reportTemplateType?: string; // MB01B (Chi nhánh) | MB02B (PGDBĐ)

  @IsString()
  @IsOptional()
  postalDepartmentName?: string; // Bưu điện tỉnh/huyện

  @IsString()
  @IsOptional()
  vietnamPostRecipient?: string; // Nơi nhận: Tổng công ty Bưu điện VN, BĐT...

  @IsString()
  @IsOptional()
  reportNo?: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  auditeeUnit?: string;

  @IsString()
  @IsOptional()
  targetAuditProcess?: string;

  @IsString()
  @IsOptional()
  decisionNo?: string;

  @IsString()
  @IsOptional()
  decisionDate?: string;

  @IsString()
  @IsOptional()
  planningPeriod?: string;

  @IsString()
  @IsOptional()
  fieldworkPeriod?: string;

  @IsString()
  @IsOptional()
  reportingPeriod?: string;

  @IsString()
  @IsOptional()
  leadAuditorName?: string;

  @IsOptional()
  teamMembers?: any;

  @IsString()
  @IsOptional()
  reportCode?: string;

  @IsString()
  @IsOptional()
  reportType?: string;

  @IsString()
  @IsOptional()
  issueLocation?: string;

  @IsString()
  @IsOptional()
  auditDate?: string;

  @IsString()
  @IsOptional()
  branchRatingCreditPersonal?: string;

  @IsString()
  @IsOptional()
  branchRatingCreditCorporate?: string;

  @IsString()
  @IsOptional()
  branchRatingNonCredit?: string;

  @IsString()
  @IsOptional()
  branchRatingPgdbd?: string;

  @IsString()
  @IsOptional()
  branchOverallRating?: string;

  @IsOptional()
  recommendationsList?: any[];

  @IsOptional()
  customFields?: Record<string, any>;

  @IsString()
  @IsOptional()
  conformanceStatement?: string;

  @IsBoolean()
  @IsOptional()
  hasNonConformance?: boolean;

  @IsString()
  @IsOptional()
  nonConformanceDetails?: string;
}
