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

  // universeName is optional — backend resolves it from auditUniverseId if not provided
  @IsOptional()
  @IsString()
  universeName?: string;

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

  // ==================== Scoring ====================

  @IsNumber()
  assessmentYear: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  totalScore?: number;

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

  @IsOptional()
  @IsString()
  riskLevel?: string;

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
  @IsNumber()
  @Min(0)
  adjustedResidualScore?: number;

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

  // ==================== THUCTE Scoring Model: Impact / Likelihood / Control Components ====================

  @IsOptional()
  impactScores?: any[]; // Chi tiết 5 thành phần Impact (THUCTE)

  @IsOptional()
  likelihoodScores?: any[]; // Chi tiết 4 thành phần Likelihood (THUCTE)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  designEffectiveness?: number; // 0 | 0.5 | 1 — Trọng số 40%

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  operatingEffectiveness?: number; // 0 | 0.5 | 1 — Trọng số 60%

  @IsOptional()
  modifiers?: any; // { isRecurring, isOverdueCritical, isEmergingRisk }

  @IsOptional()
  highRiskFactors?: any; // 12 tiêu chí nhận diện đơn vị rủi ro cao (Điều 4.3 QT 3002)

  // ==================== Scoring Metadata (Client-side computed, stored for display) ====================

  @IsOptional()
  @IsString()
  scoringMode?: string; // 'thucte' | 'criteria'

  @IsOptional()
  @IsString()
  riskLevelCode?: string; // 'Low' | 'Medium' | 'High' | 'Critical' (English code)

  @IsOptional()
  @IsString()
  riskBand?: string; // 'Xanh' | 'Vàng' | 'Cam' | 'Đỏ' (Vietnamese band)

  @IsOptional()
  @IsNumber()
  nextAuditYear?: number; // Năm kiểm toán đề xuất tiếp theo

  @IsOptional()
  @IsString()
  rationale?: string; // Ghi chú / Căn cứ điều chỉnh điểm hoặc nhận định

  @IsOptional()
  @IsString()
  status?: string; // Draft | Submitted | Approved | Rejected

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
