import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsInt,
  IsIn,
} from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsOptional()
  @IsInt()
  auditUniverseId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Tên quy trình không được để trống' })
  universeName: string;

  @IsOptional()
  @IsString()
  department?: string;

  // ==================== Phân nhóm kiểm toán (IIA 2024) ====================

  @IsOptional()
  @IsString()
  @IsIn(['HoiSo', 'ChiNhanh', 'PGD', 'HeThong', 'ChuyenDe'], {
    message: 'auditCategory phải là: HoiSo, ChiNhanh, PGD, HeThong, ChuyenDe',
  })
  auditCategory?: string;

  @IsOptional()
  @IsString()

  // ==================== Scoring ====================
  @IsNumber()
  assessmentYear: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  totalScore: number;

  @IsOptional()
  criteriaScores?: any; // JSON chi tiết chấm điểm từng tiêu chí

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impact?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  likelihood?: number;

  @IsString()
  @IsNotEmpty({ message: 'Mức độ rủi ro không được để trống' })
  riskLevel: string;

  // ==================== Inherent → Control → Residual Risk (Basel/BCBS) ====================

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  inherentRiskScore?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Strong', 'Adequate', 'Weak', 'Ineffective'], {
    message:
      'controlEffectiveness phải là: Strong, Adequate, Weak, Ineffective',
  })
  controlEffectiveness?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  residualRiskScore?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Increasing', 'Stable', 'Decreasing'], {
    message: 'riskVelocity phải là: Increasing, Stable, Decreasing',
  })
  riskVelocity?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Accept', 'Mitigate', 'Avoid', 'Transfer'], {
    message: 'riskAppetite phải là: Accept, Mitigate, Avoid, Transfer',
  })
  riskAppetite?: string;

  // ==================== Audit Planning ====================

  @IsOptional()
  @IsString()
  @IsIn(['Annual', 'Biennial', 'Triennial', 'AdHoc'], {
    message: 'auditFrequency phải là: Annual, Biennial, Triennial, AdHoc',
  })
  auditFrequency?: string;

  @IsOptional()
  @IsString()
  lastAuditDate?: string;

  // ==================== Thông tin bổ sung ====================

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @IsOptional()
  @IsString()
  riskDescription?: string;

  @IsOptional()
  @IsInt()
  assessedBy?: number;

  @IsOptional()
  @IsString()
  assessedByName?: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  assessedByUserId?: number;

  @IsOptional()
  @IsNumber()
  reviewedByUserId?: number;
}
