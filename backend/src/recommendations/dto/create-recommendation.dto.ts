import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateRecommendationDto {
  @IsString()
  @IsOptional()
  finding?: string;

  @IsString()
  @IsNotEmpty({ message: 'Kiến nghị không được để trống' })
  recommendation: string;

  @IsString()
  @IsNotEmpty({ message: 'Đơn vị chịu trách nhiệm không được để trống' })
  department: string;

  @IsString()
  @IsNotEmpty({ message: 'Thời hạn không được để trống' })
  dueDate: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  response?: string;

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
  monitoringCycle?: string;

  @IsString()
  @IsOptional()
  auditeeUnitHead?: string;

  @IsString()
  @IsOptional()
  auditeePoc?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsNumber()
  @IsOptional()
  findingId?: number;

  @IsNumber()
  @IsOptional()
  auditeeOwnerId?: number;

  @IsString()
  @IsOptional()
  auditeeOwnerName?: string;

  @IsNumber()
  @IsOptional()
  ktnbReviewerId?: number;

  @IsString()
  @IsOptional()
  ktnbReviewerName?: string;

  @IsNumber()
  @IsOptional()
  assignedToId?: number;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  closureStatus?: string;

  @IsString()
  @IsOptional()
  slaStatus?: string;

  @IsBoolean()
  @IsOptional()
  selfMonitored?: boolean;

  @IsString()
  @IsOptional()
  selfMonitorFrequency?: string;

  @IsString()
  @IsOptional()
  closedReason?: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  auditeeUnitHeadUserId?: number;

  @IsOptional()
  @IsNumber()
  auditeePocUserId?: number;

  @IsString()
  @IsOptional()
  riskAcceptanceStatus?: string;

  @IsString()
  @IsOptional()
  riskAcceptanceReason?: string;

  @IsNumber()
  @IsOptional()
  riskAcceptanceRequestedById?: number;

  @IsString()
  @IsOptional()
  riskAcceptanceRequestedByName?: string;

  @IsOptional()
  riskAcceptanceRequestedAt?: Date;

  @IsNumber()
  @IsOptional()
  riskAcceptanceApprovedById?: number;

  @IsString()
  @IsOptional()
  riskAcceptanceApprovedByName?: string;

  @IsOptional()
  riskAcceptanceApprovedAt?: Date;

  @IsString()
  @IsOptional()
  riskAcceptanceNotes?: string;
}
