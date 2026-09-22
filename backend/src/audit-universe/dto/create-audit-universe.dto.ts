import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuditUniverseDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên quy trình/đơn vị không được để trống' })
  name: string;

  @IsString()
  @IsOptional()
  department?: string; // Tên đơn vị hiển thị

  @IsString()
  @IsOptional()
  departmentCode?: string; // Mã đơn vị liên kết cơ cấu tổ chức

  /**
   * KHCN | HUB_DN_VanHanh | TrungTamKinhDoanh | TrungTamKHDNLon
   */
  @IsString()
  @IsOptional()
  @IsString()
  @IsOptional()
  auditCategory?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  ownerTeam?: string;

  @IsString()
  @IsOptional()
  lastAuditDate?: string;

  @IsOptional()
  financialSize?: number;

  @IsOptional()
  operationalRiskScore?: number;

  @IsOptional()
  pastFindingsScore?: number;

  @IsOptional()
  riskScore?: number;

  @IsString()
  @IsOptional()
  dynamicRiskRating?: string;

  @IsOptional()
  nextAuditYear?: number;

  @IsOptional()
  lineOfDefense?: number;

  @IsOptional()
  customFields?: Record<string, any>;

  @IsOptional()
  layer?: number;

  @IsOptional()
  scoreDetails?: Record<string, any>;
}
