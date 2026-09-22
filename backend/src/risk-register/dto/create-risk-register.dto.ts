import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateRiskRegisterDto {
  @IsOptional()
  @IsNumber()
  auditObjectId?: number;

  @IsOptional()
  @IsString()
  hsrrCode?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsNumber()
  sequenceNo?: number;

  @IsNotEmpty()
  @IsString()
  riskCategory: string;

  @IsNotEmpty()
  @IsString()
  riskTitle: string;

  @IsOptional()
  @IsString()
  riskDescription?: string;

  @IsOptional()
  @IsString()
  impactAssessment?: string;

  @IsOptional()
  @IsString()
  likelihoodAssessment?: string;

  @IsOptional()
  @IsNumber()
  impactScore?: number;

  @IsOptional()
  @IsNumber()
  likelihoodScore?: number;

  @IsOptional()
  @IsNumber()
  inherentRiskScore?: number;

  @IsOptional()
  @IsString()
  inherentRiskLevel?: string;

  @IsOptional()
  @IsString()
  controlObjective?: string;

  @IsOptional()
  @IsString()
  controlMeasures?: string;

  @IsOptional()
  @IsString()
  controlCriteria?: string;

  @IsOptional()
  @IsNumber()
  designEffectiveness?: number;

  @IsOptional()
  @IsNumber()
  operatingEffectiveness?: number;

  @IsOptional()
  @IsString()
  controlRating?: string;

  @IsOptional()
  @IsNumber()
  residualLikelihood?: number;

  @IsOptional()
  @IsNumber()
  residualImpact?: number;

  @IsOptional()
  @IsNumber()
  residualRiskScore?: number;

  @IsOptional()
  @IsString()
  finalRiskBand?: string;

  @IsOptional()
  @IsString()
  riskResponse?: string;

  @IsOptional()
  @IsString()
  actionPlan?: string;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  responsibleUnit?: string;

  @IsOptional()
  @IsNumber()
  riskOwnerId?: number;

  @IsOptional()
  @IsString()
  riskOwnerName?: string;

  @IsOptional()
  relatedIssueIds?: number[];

  @IsOptional()
  relatedRcmIds?: number[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  assessmentYear?: number;
}
