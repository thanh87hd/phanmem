import { Injectable, Logger } from '@nestjs/common';

// ==================== Interfaces ====================

export interface ImpactScoringItem {
  component: string; // 'Tài chính' | 'Pháp lý/tuân thủ' | 'Khách hàng/danh tiếng' | 'Hoạt động/resilience' | 'Dữ liệu/CNTT'
  weight: number; // 0.25, 0.25, 0.15, 0.20, 0.15
  score: number; // 1-5
  note?: string;
}

export interface LikelihoodScoringItem {
  component: string; // 'Tần suất/phơi nhiễm' | 'Lịch sử sự cố/lỗi' | 'Mức độ thay đổi' | 'KRI/cảnh báo sớm'
  weight: number; // 0.35, 0.25, 0.20, 0.20
  score: number; // 1-5
  note?: string;
}

export interface CriterionScoringItem {
  criteriaId?: number;
  criteriaName: string;
  category?: string; // Tín dụng, Vận hành, Tuân thủ, Tài chính, CNTT...
  weight: number; // Tỷ trọng (0 - 100%)
  score: number; // Điểm 1 - 5
  note?: string;
  weightedScore?: number;
}

export interface HighRiskFactorItem {
  key: string;
  label: string;
  checked: boolean;
  note?: string;
}

export class UnifiedRiskCalculationInput {
  // Legacy: backward-compatible scoring
  criteriaScores?: CriterionScoringItem[];
  inherentRiskScore?: number;
  controlEffectiveness?: string;
  highRiskFactors?: Record<string, boolean> | HighRiskFactorItem[];
  riskVelocity?: string;
  financialSize?: number;
  operationalRiskScore?: number;
  pastFindingsScore?: number;

  // THUCTE Scoring Model: chi tiết Impact/Likelihood/Control/Modifiers
  impactScores?: ImpactScoringItem[];
  likelihoodScores?: LikelihoodScoringItem[];
  designEffectiveness?: number; // 0 | 0.5 | 1
  operatingEffectiveness?: number; // 0 | 0.5 | 1
  isRecurring?: boolean; // Modifier ×1.2
  isOverdueCritical?: boolean; // Modifier ×1.15
  isEmergingRisk?: boolean; // Modifier ×1.1
  rcsaAdjustment?: number; // GIAS 9.5: Tuyến 1 RCSA adjustment (+0.1 to +0.5 nếu kiểm soát có khiếm khuyết)
}

export interface UnifiedRiskCalculationResult {
  inherentRiskScore: number; // 1.0 - 5.0
  impactComposite: number; // Weighted average of impact components
  likelihoodComposite: number; // Weighted average of likelihood components
  controlEffectiveness: string;
  controlMultiplier: number; // CE = 0.4×DE + 0.6×OE (0→1)
  designEffectiveness: number; // 0 | 0.5 | 1
  operatingEffectiveness: number; // 0 | 0.5 | 1
  residualRiskScore: number; // Inherent × (1 - CE)
  adjustedResidualScore: number; // Residual × Modifiers (capped at 5)
  modifierScore: number; // Product of active modifiers
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskLevelVi: 'Thấp' | 'Trung bình' | 'Cao' | 'Rất cao';
  riskBand: string; // Xanh | Vàng | Cam | Đỏ
  auditFrequency: 'Annual' | 'Biennial' | 'Triennial';
  auditFrequencyVi: 'Hằng năm (1 năm/lần)' | '2 năm/lần' | '3 năm/lần';
  suggestedAuditYear: number;
  highRiskFactorsCount: number;
  criteriaScores: CriterionScoringItem[];
  impactScores: ImpactScoringItem[];
  likelihoodScores: LikelihoodScoringItem[];
}

// ==================== Default Templates ====================

export const DEFAULT_IMPACT_TEMPLATE: ImpactScoringItem[] = [
  { component: 'Tài chính', weight: 0.25, score: 3 },
  { component: 'Pháp lý/tuân thủ', weight: 0.25, score: 3 },
  { component: 'Khách hàng/danh tiếng', weight: 0.15, score: 3 },
  { component: 'Hoạt động/resilience', weight: 0.2, score: 3 },
  { component: 'Dữ liệu/CNTT', weight: 0.15, score: 3 },
];

export const DEFAULT_LIKELIHOOD_TEMPLATE: LikelihoodScoringItem[] = [
  { component: 'Tần suất/phơi nhiễm', weight: 0.35, score: 3 },
  { component: 'Lịch sử sự cố/lỗi', weight: 0.25, score: 3 },
  { component: 'Mức độ thay đổi', weight: 0.2, score: 3 },
  { component: 'KRI/cảnh báo sớm', weight: 0.2, score: 3 },
];

@Injectable()
export class UnifiedRiskEngineService {
  private readonly logger = new Logger(UnifiedRiskEngineService.name);

  /**
   * Tính toán toàn diện theo THUCTE Scoring Model:
   * Impact (5 thành phần) × Likelihood (4 thành phần) → Inherent Risk
   * Design Effectiveness (40%) + Operating Effectiveness (60%) → Control Effectiveness
   * Inherent × (1 - CE) → Residual Risk
   * Residual × Modifiers → Adjusted Residual Risk
   * Adjusted Residual → Risk Band → Audit Frequency
   */
  calculate(input: UnifiedRiskCalculationInput): UnifiedRiskCalculationResult {
    // 1. Tính Impact Composite (weighted average of 5 components)
    const impactScores = this.normalizeImpactScores(input);
    const impactComposite = this.weightedAverage(
      impactScores.map((s) => ({ weight: s.weight, score: s.score })),
    );

    // 2. Tính Likelihood Composite (weighted average of 4 components)
    const likelihoodScores = this.normalizeLikelihoodScores(input);
    const likelihoodComposite = this.weightedAverage(
      likelihoodScores.map((s) => ({ weight: s.weight, score: s.score })),
    );

    // 3. Tính Inherent Risk Score
    let inherentScore = this.calculateInherentScore(
      input,
      impactComposite,
      likelihoodComposite,
    );

    // 4. Xét High Risk Factors override
    let highRiskCount = 0;
    if (input.highRiskFactors) {
      if (Array.isArray(input.highRiskFactors)) {
        highRiskCount = input.highRiskFactors.filter((f) => f.checked).length;
      } else {
        highRiskCount = Object.values(input.highRiskFactors).filter(
          Boolean,
        ).length;
      }
    }
    if (highRiskCount >= 4) {
      inherentScore = Math.max(inherentScore, 4.5);
    } else if (highRiskCount >= 2) {
      inherentScore = Math.max(inherentScore, 3.8);
    }

    // 5. Tính Control Effectiveness (THUCTE: CE = 0.4×DE + 0.6×OE)
    const { ce, designEff, operatingEff, normalizedCE, controlMultiplier } =
      this.calculateControlEffectiveness(input);

    // 6. Tính Residual Risk Score = Inherent × (1 - CE)
    let residualScore = this.round2(inherentScore * (1 - ce));
    residualScore = Math.max(1.0, Math.min(5.0, residualScore));

    // 7. Tính Modifiers (THUCTE: Tái diễn ×1.2, Quá hạn ×1.15, Rủi ro mới nổi ×1.1)
    const modifierScore = this.calculateModifiers(input);

    // 8. Adjusted Residual = Residual × Modifier (capped at 5.0)
    let adjustedResidual = this.round2(residualScore * modifierScore);
    adjustedResidual = Math.min(5.0, adjustedResidual);

    // 9. Xét Risk Velocity
    const velocity = input.riskVelocity || 'Stable';
    if (velocity === 'Increasing' || velocity === 'Tăng') {
      adjustedResidual = Math.min(5.0, adjustedResidual + 0.3);
    } else if (velocity === 'Decreasing' || velocity === 'Giảm') {
      adjustedResidual = Math.max(1.0, adjustedResidual - 0.2);
    }

    // 9.1 GIAS 9.5: Tích hợp RCSA (Tuyến 1 tự đánh giá rủi ro/kiểm soát)
    if (input.rcsaAdjustment && typeof input.rcsaAdjustment === 'number') {
      adjustedResidual = Math.max(
        1.0,
        Math.min(5.0, this.round2(adjustedResidual + input.rcsaAdjustment)),
      );
    }

    // 10. Xếp hạng Risk Level + Risk Band
    const { riskLevel, riskLevelVi, riskBand } = this.classifyRisk(
      adjustedResidual,
      highRiskCount,
    );

    // 11. Khuyến nghị Tần suất & Năm kiểm toán
    const { auditFrequency, auditFrequencyVi, suggestedAuditYear } =
      this.suggestAuditFrequency(riskLevel);

    // 12. Backward-compatible criteriaScores
    const criteriaScores = this.normalizeLegacyCriteriaScores(input);

    return {
      inherentRiskScore: this.round2(inherentScore),
      impactComposite: this.round2(impactComposite),
      likelihoodComposite: this.round2(likelihoodComposite),
      controlEffectiveness: normalizedCE,
      controlMultiplier,
      designEffectiveness: designEff,
      operatingEffectiveness: operatingEff,
      residualRiskScore: this.round2(residualScore),
      adjustedResidualScore: this.round2(adjustedResidual),
      modifierScore: this.round2(modifierScore),
      riskLevel,
      riskLevelVi,
      riskBand,
      auditFrequency,
      auditFrequencyVi,
      suggestedAuditYear,
      highRiskFactorsCount: highRiskCount,
      criteriaScores,
      impactScores,
      likelihoodScores,
    };
  }

  // ==================== Private Helpers ====================

  private normalizeImpactScores(
    input: UnifiedRiskCalculationInput,
  ): ImpactScoringItem[] {
    if (input.impactScores && input.impactScores.length > 0) {
      return input.impactScores.map((s) => ({
        ...s,
        score: Math.max(1, Math.min(5, Number(s.score) || 3)),
      }));
    }
    // Fallback: dùng impact đơn giản cho tất cả thành phần
    const fallbackScore = Number(input.inherentRiskScore) || 3;
    return DEFAULT_IMPACT_TEMPLATE.map((t) => ({
      ...t,
      score: fallbackScore,
    }));
  }

  private normalizeLikelihoodScores(
    input: UnifiedRiskCalculationInput,
  ): LikelihoodScoringItem[] {
    if (input.likelihoodScores && input.likelihoodScores.length > 0) {
      return input.likelihoodScores.map((s) => ({
        ...s,
        score: Math.max(1, Math.min(5, Number(s.score) || 3)),
      }));
    }
    const fallbackScore = Number(input.inherentRiskScore) || 3;
    return DEFAULT_LIKELIHOOD_TEMPLATE.map((t) => ({
      ...t,
      score: fallbackScore,
    }));
  }

  private calculateInherentScore(
    input: UnifiedRiskCalculationInput,
    impactComposite: number,
    likelihoodComposite: number,
  ): number {
    // Ưu tiên 1: Nếu có Impact+Likelihood scores chi tiết → dùng công thức THUCTE
    if (
      (input.impactScores && input.impactScores.length > 0) ||
      (input.likelihoodScores && input.likelihoodScores.length > 0)
    ) {
      // Inherent = (Impact + Likelihood) / 2 hoặc dùng geometric mean
      return this.round2((impactComposite + likelihoodComposite) / 2);
    }

    // Ưu tiên 2: criteriaScores (legacy, backward-compatible)
    if (input.criteriaScores && input.criteriaScores.length > 0) {
      return this.legacyCriteriaInherent(input.criteriaScores);
    }

    // Ưu tiên 3: inherentRiskScore trực tiếp
    if (input.inherentRiskScore) {
      return Math.max(1, Math.min(5, Number(input.inherentRiskScore)));
    }

    // Fallback: từ chỉ số cơ bản
    const fin = Number(input.financialSize) || 3;
    const oper = Number(input.operationalRiskScore) || 3;
    const past = Number(input.pastFindingsScore) || 3;
    return this.round2(0.35 * fin + 0.35 * oper + 0.3 * past);
  }

  private legacyCriteriaInherent(
    criteriaScores: CriterionScoringItem[],
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of criteriaScores) {
      const score = Math.max(1, Math.min(5, Number(c.score) || 3));
      const weight = Number(c.weight) || 0;
      totalWeight += weight;
      weightedSum += score * weight;
    }
    if (totalWeight > 0) {
      return this.round2(weightedSum / totalWeight);
    }
    return this.round2(weightedSum / criteriaScores.length);
  }

  private calculateControlEffectiveness(input: UnifiedRiskCalculationInput): {
    ce: number;
    designEff: number;
    operatingEff: number;
    normalizedCE: string;
    controlMultiplier: number;
  } {
    // Ưu tiên 1: THUCTE model — Design (40%) + Operating (60%)
    if (
      input.designEffectiveness != null &&
      input.operatingEffectiveness != null
    ) {
      const de = Math.max(0, Math.min(1, Number(input.designEffectiveness)));
      const oe = Math.max(0, Math.min(1, Number(input.operatingEffectiveness)));
      const ce = this.round2(0.4 * de + 0.6 * oe); // 0 → 1

      let normalizedCE = 'Adequate';
      if (ce >= 0.8) normalizedCE = 'Strong';
      else if (ce >= 0.5) normalizedCE = 'Adequate';
      else normalizedCE = 'Weak';

      return {
        ce,
        designEff: de,
        operatingEff: oe,
        normalizedCE,
        controlMultiplier: this.round2(1 - ce),
      };
    }

    // Fallback: Legacy text-based controlEffectiveness
    const ceText = (input.controlEffectiveness || 'Adequate').toLowerCase();
    let ce = 0.25; // Default Adequate = 25% reduction
    let normalizedCE = 'Adequate';

    if (
      ceText.includes('strong') ||
      ceText.includes('cao') ||
      ceText.includes('tốt') ||
      ceText.includes('effective')
    ) {
      ce = 0.5;
      normalizedCE = 'Strong';
    } else if (
      ceText.includes('weak') ||
      ceText.includes('thấp') ||
      ceText.includes('yếu') ||
      ceText.includes('ineffective')
    ) {
      ce = 0;
      normalizedCE = 'Weak';
    }

    // Infer design/operating from text
    const designEff = ce >= 0.4 ? 1 : ce >= 0.2 ? 0.5 : 0;
    const operatingEff = ce >= 0.3 ? 1 : ce >= 0.15 ? 0.5 : 0;

    return {
      ce,
      designEff,
      operatingEff,
      normalizedCE,
      controlMultiplier: this.round2(1 - ce),
    };
  }

  private calculateModifiers(input: UnifiedRiskCalculationInput): number {
    let modifier = 1.0;
    if (input.isRecurring) modifier *= 1.2;
    if (input.isOverdueCritical) modifier *= 1.15;
    if (input.isEmergingRisk) modifier *= 1.1;
    return this.round2(modifier);
  }

  private classifyRisk(
    adjustedResidual: number,
    highRiskCount: number,
  ): {
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    riskLevelVi: 'Thấp' | 'Trung bình' | 'Cao' | 'Rất cao';
    riskBand: string;
  } {
    if (adjustedResidual >= 4.2 || highRiskCount >= 4) {
      return { riskLevel: 'Critical', riskLevelVi: 'Rất cao', riskBand: 'Đỏ' };
    } else if (adjustedResidual >= 3.4 || highRiskCount >= 2) {
      return { riskLevel: 'High', riskLevelVi: 'Cao', riskBand: 'Cam' };
    } else if (adjustedResidual >= 2.4) {
      return {
        riskLevel: 'Medium',
        riskLevelVi: 'Trung bình',
        riskBand: 'Vàng',
      };
    }
    return { riskLevel: 'Low', riskLevelVi: 'Thấp', riskBand: 'Xanh' };
  }

  private suggestAuditFrequency(riskLevel: string): {
    auditFrequency: 'Annual' | 'Biennial' | 'Triennial';
    auditFrequencyVi: 'Hằng năm (1 năm/lần)' | '2 năm/lần' | '3 năm/lần';
    suggestedAuditYear: number;
  } {
    const currentYear = new Date().getFullYear();
    if (riskLevel === 'Critical') {
      return {
        auditFrequency: 'Annual',
        auditFrequencyVi: 'Hằng năm (1 năm/lần)',
        suggestedAuditYear: currentYear + 1,
      };
    } else if (riskLevel === 'High') {
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

  private normalizeLegacyCriteriaScores(
    input: UnifiedRiskCalculationInput,
  ): CriterionScoringItem[] {
    if (!input.criteriaScores || input.criteriaScores.length === 0) return [];
    return input.criteriaScores.map((c) => {
      const score = Math.max(1, Math.min(5, Number(c.score) || 3));
      const weight = Number(c.weight) || 0;
      return {
        ...c,
        score,
        weight,
        weightedScore: this.round2((score * weight) / 100),
      };
    });
  }

  private weightedAverage(items: { weight: number; score: number }[]): number {
    if (!items || items.length === 0) return 3;
    let totalWeight = 0;
    let weightedSum = 0;
    for (const item of items) {
      const w = Number(item.weight) || 0;
      const s = Math.max(1, Math.min(5, Number(item.score) || 3));
      totalWeight += w;
      weightedSum += w * s;
    }
    if (totalWeight > 0) return this.round2(weightedSum / totalWeight);
    return this.round2(
      items.reduce((sum, i) => sum + (Number(i.score) || 3), 0) / items.length,
    );
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
