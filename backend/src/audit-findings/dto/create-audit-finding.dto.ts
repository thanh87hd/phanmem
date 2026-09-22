import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateAuditFindingDto {
  @IsNumber()
  @IsOptional()
  workingPaperId?: number;

  @IsNumber()
  @IsOptional()
  engagementId?: number;

  @IsNumber()
  @IsOptional()
  workstreamId?: number;

  @IsString()
  @IsOptional()
  wpTitle?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề phát hiện không được để trống' })
  findingTitle: string;

  @IsString()
  @IsOptional()
  findingCode?: string;

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
  cifOrAccount?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  customerType?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsString()
  @IsOptional()
  riskGroupGeneral?: string;

  @IsString()
  @IsOptional()
  riskGroupDetail?: string;

  @IsString()
  @IsOptional()
  consequence?: string;

  @IsString()
  @IsOptional()
  cause?: string;

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
  recommendation?: string;

  @IsString()
  @IsOptional()
  recommendationTarget?: string;

  @IsString()
  @IsOptional()
  recommendationType?: string;

  @IsString()
  @IsOptional()
  rootCauseCategory?: string;

  @IsString()
  @IsOptional()
  rootCauseDetails?: string;

  @IsString()
  @IsIn(['Critical', 'High', 'Medium', 'Low'], {
    message: 'Mức rủi ro phải là Critical, High, Medium hoặc Low',
  })
  riskLevel: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  auditeeResponse?: string;

  @IsString()
  @IsOptional()
  criteria?: string;

  @IsString()
  @IsOptional()
  findingCategory?: string;

  @IsString()
  @IsOptional()
  findingNature?: string;

  @IsNumber()
  @IsOptional()
  reportedByAuditorId?: number;

  @IsNumber()
  @IsOptional()
  responsibleUnitId?: number;

  @IsOptional()
  appendices?: any;

  @IsOptional()
  @IsNumber()
  managingBranchId?: number;

  @IsOptional()
  @IsNumber()
  proposerUserId?: number;

  @IsOptional()
  @IsNumber()
  appraiserUserId?: number;

  @IsOptional()
  @IsNumber()
  businessLeaderUserId?: number;

  @IsOptional()
  @IsNumber()
  defectCodeId?: number;

  @IsOptional()
  @IsNumber()
  internalDefectCodeId?: number;

  @IsOptional()
  @IsString()
  internalDefectCode?: string;

  @IsOptional()
  @IsNumber()
  nd340DefectCodeId?: number;

  @IsOptional()
  @IsString()
  nd340DefectCode?: string;

  @IsOptional()
  @IsNumber()
  nhanSuDefectCodeId?: number;

  @IsOptional()
  @IsString()
  nhanSuDefectCode?: string;

  @IsOptional()
  @IsNumber()
  businessProcessId?: number;

  @IsOptional()
  @IsNumber()
  actualFineAmount?: number;
}
