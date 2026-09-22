/**
 * Risk Classification Helper — Single Source of Truth
 * Tập trung toàn bộ logic phân loại mức rủi ro theo GIAS 2024 / THUCTE Scoring Model.
 * Xóa bỏ mọi logic phân loại trùng lặp trong audit-plans.service, risk-assessments.service, frontend.
 */

export type RiskBand = 'Xanh' | 'Vàng' | 'Cam' | 'Đỏ';
export type RiskLevelEN = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskLevelVI = 'Thấp' | 'Trung bình' | 'Cao' | 'Rất cao';

export interface RiskClassification {
  riskLevel: RiskLevelEN;
  riskLevelVi: RiskLevelVI;
  riskBand: RiskBand;
  isHighRisk: boolean;
}

/**
 * Xếp hạng rủi ro từ adjusted residual score (1.0 → 5.0)
 * Dùng cho Unified Risk Engine output
 */
export function classifyByAdjustedResidual(
  adjustedResidual: number,
  highRiskFactorsCount = 0,
): RiskClassification {
  if (adjustedResidual >= 4.2 || highRiskFactorsCount >= 4) {
    return {
      riskLevel: 'Critical',
      riskLevelVi: 'Rất cao',
      riskBand: 'Đỏ',
      isHighRisk: true,
    };
  }
  if (adjustedResidual >= 3.4 || highRiskFactorsCount >= 2) {
    return {
      riskLevel: 'High',
      riskLevelVi: 'Cao',
      riskBand: 'Cam',
      isHighRisk: true,
    };
  }
  if (adjustedResidual >= 2.4) {
    return {
      riskLevel: 'Medium',
      riskLevelVi: 'Trung bình',
      riskBand: 'Vàng',
      isHighRisk: false,
    };
  }
  return {
    riskLevel: 'Low',
    riskLevelVi: 'Thấp',
    riskBand: 'Xanh',
    isHighRisk: false,
  };
}

/**
 * Kiểm tra 1 RiskAssessment có phải high risk không
 * Dùng cho audit-plans coverage analysis, dashboard, frontend tags
 * Thay thế toàn bộ logic hardcoded tại audit-plans.service.ts:41-53
 * và risk-assessments.service.ts:863-870
 */
export function isHighRiskAssessment(assessment: {
  riskLevel?: string;
  residualRiskScore?: number;
  totalScore?: number;
  adjustedResidualScore?: number;
}): boolean {
  const level = String(assessment.riskLevel || '').toLowerCase();

  // Hạng 4-5 (THUCTE Vietnamese ranking)
  if (
    level.includes('hạng 4') ||
    level.includes('hang 4') ||
    level.includes('hạng 5') ||
    level.includes('hang 5')
  ) {
    return true;
  }

  // English classification
  if (level.includes('high') || level.includes('critical')) {
    return true;
  }

  // Score-based fallback
  if (
    (assessment.adjustedResidualScore ?? assessment.residualRiskScore ?? 0) >=
    3.4
  ) {
    return true;
  }
  if ((assessment.totalScore ?? 0) >= 60) {
    return true;
  }

  return false;
}

/**
 * Parse riskLevel string → normalized object
 * Hỗ trợ cả format "Hạng 1 (Tốt)" và "High" / "Low"
 */
export function parseRiskLevel(riskLevel: string): {
  rank: number; // 1-5 (0 if unknown)
  label: RiskLevelEN;
  labelVi: string;
  band: RiskBand;
  isHighRisk: boolean;
} {
  const level = (riskLevel || '').toLowerCase();

  if (
    level.includes('hạng 5') ||
    level.includes('hang 5') ||
    level === 'critical'
  ) {
    return {
      rank: 5,
      label: 'Critical',
      labelVi: 'Hạng 5 (Kém)',
      band: 'Đỏ',
      isHighRisk: true,
    };
  }
  if (
    level.includes('hạng 4') ||
    level.includes('hang 4') ||
    level === 'high'
  ) {
    return {
      rank: 4,
      label: 'High',
      labelVi: 'Hạng 4 (Yếu)',
      band: 'Cam',
      isHighRisk: true,
    };
  }
  if (
    level.includes('hạng 3') ||
    level.includes('hang 3') ||
    level === 'medium'
  ) {
    return {
      rank: 3,
      label: 'Medium',
      labelVi: 'Hạng 3 (Trung bình)',
      band: 'Vàng',
      isHighRisk: false,
    };
  }
  if (level.includes('hạng 2') || level.includes('hang 2')) {
    return {
      rank: 2,
      label: 'Low',
      labelVi: 'Hạng 2 (Khá)',
      band: 'Xanh',
      isHighRisk: false,
    };
  }
  if (level.includes('hạng 1') || level.includes('hang 1') || level === 'low') {
    return {
      rank: 1,
      label: 'Low',
      labelVi: 'Hạng 1 (Tốt)',
      band: 'Xanh',
      isHighRisk: false,
    };
  }

  return {
    rank: 0,
    label: 'Medium',
    labelVi: 'Chưa xếp hạng',
    band: 'Vàng',
    isHighRisk: false,
  };
}

/**
 * Khuyến nghị tần suất kiểm toán dựa trên risk level
 * Thay thế `recommendAuditFrequency()` trong risk-assessments.service.ts
 */
export function recommendAuditFrequency(riskLevel: RiskLevelEN): {
  auditFrequency: 'Annual' | 'Biennial' | 'Triennial';
  auditFrequencyVi: string;
  suggestedAuditYear: number;
} {
  const currentYear = new Date().getFullYear();

  if (riskLevel === 'Critical') {
    return {
      auditFrequency: 'Annual',
      auditFrequencyVi: 'Hằng năm (1 năm/lần)',
      suggestedAuditYear: currentYear + 1,
    };
  }
  if (riskLevel === 'High') {
    return {
      auditFrequency: 'Biennial',
      auditFrequencyVi: '2 năm/lần',
      suggestedAuditYear: currentYear + 2,
    };
  }
  return {
    auditFrequency: 'Triennial',
    auditFrequencyVi: '3 năm/lần',
    suggestedAuditYear: currentYear + 3,
  };
}

/**
 * Risk level → color code for frontend display
 * Single source of truth cho tất cả component (Dashboard, RiskScoringTab, AuditPlan...)
 */
export function getRiskColor(riskLevel: string): string {
  const parsed = parseRiskLevel(riskLevel);
  switch (parsed.band) {
    case 'Đỏ':
      return '#cf1322';
    case 'Cam':
      return '#d46b08';
    case 'Vàng':
      return '#faad14';
    case 'Xanh':
      return '#389e0d';
    default:
      return '#999';
  }
}

/**
 * Risk level → Ant Design Tag color
 */
export function getRiskTagColor(riskLevel: string): string {
  const parsed = parseRiskLevel(riskLevel);
  switch (parsed.band) {
    case 'Đỏ':
      return 'error';
    case 'Cam':
      return 'warning';
    case 'Vàng':
      return 'processing';
    case 'Xanh':
      return 'success';
    default:
      return 'default';
  }
}
