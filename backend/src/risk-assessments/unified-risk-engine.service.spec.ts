import { Test, TestingModule } from '@nestjs/testing';
import {
  UnifiedRiskEngineService,
  UnifiedRiskCalculationInput,
} from './unified-risk-engine.service';

describe('UnifiedRiskEngineService', () => {
  let service: UnifiedRiskEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnifiedRiskEngineService],
    }).compile();

    service = module.get<UnifiedRiskEngineService>(UnifiedRiskEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Legacy backward compatibility', () => {
    it('should calculate inherent risk from criteriaScores (legacy path)', () => {
      const input: UnifiedRiskCalculationInput = {
        criteriaScores: [
          { criteriaName: 'Tín dụng', weight: 40, score: 4 },
          { criteriaName: 'Vận hành', weight: 60, score: 3 },
        ],
        controlEffectiveness: 'Adequate',
      };

      const result = service.calculate(input);
      // (4*40 + 3*60) / 100 = 3.4
      expect(result.inherentRiskScore).toBe(3.4);
      expect(result.controlEffectiveness).toBe('Adequate');
      // Legacy Adequate => CE = 0.25, residual = 3.4 * (1 - 0.25) = 2.55
      expect(result.residualRiskScore).toBe(2.55);
      expect(result.riskLevel).toBe('Medium');
      expect(result.riskLevelVi).toBe('Trung bình');
    });

    it('should calculate inherent risk from fallback metrics if criteriaScores empty', () => {
      const input: UnifiedRiskCalculationInput = {
        financialSize: 4,
        operationalRiskScore: 4,
        pastFindingsScore: 4,
        controlEffectiveness: 'Strong',
      };

      const result = service.calculate(input);
      // 0.35*4 + 0.35*4 + 0.3*4 = 4.0
      expect(result.inherentRiskScore).toBe(4.0);
      expect(result.controlEffectiveness).toBe('Strong');
      // Strong => CE = 0.5, residual = 4.0 * 0.5 = 2.0
      expect(result.residualRiskScore).toBe(2.0);
      expect(result.riskLevel).toBe('Low');
    });

    it('should override inherent score when high risk factors count >= 4', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 2.0,
        controlEffectiveness: 'Weak',
        highRiskFactors: [
          { key: 'f1', label: 'F1', checked: true },
          { key: 'f2', label: 'F2', checked: true },
          { key: 'f3', label: 'F3', checked: true },
          { key: 'f4', label: 'F4', checked: true },
        ],
      };

      const result = service.calculate(input);
      expect(result.highRiskFactorsCount).toBe(4);
      expect(result.inherentRiskScore).toBeGreaterThanOrEqual(4.5);
      expect(result.controlEffectiveness).toBe('Weak');
      // Weak => CE = 0, multiplier = 1.0
      expect(result.controlMultiplier).toBe(1.0);
      expect(result.riskLevel).toBe('Critical');
      expect(result.riskLevelVi).toBe('Rất cao');
      expect(result.auditFrequency).toBe('Annual');
      expect(result.suggestedAuditYear).toBe(new Date().getFullYear() + 1);
    });

    it('should handle highRiskFactors as an object map and apply velocity adjustment', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 3.5,
        controlEffectiveness: 'Adequate',
        highRiskFactors: {
          factor1: true,
          factor2: true,
          factor3: false,
        },
        riskVelocity: 'Increasing',
      };

      const result = service.calculate(input);
      expect(result.highRiskFactorsCount).toBe(2);
      expect(result.inherentRiskScore).toBeGreaterThanOrEqual(3.8);
      expect(result.riskLevel).toBe('High');
      expect(result.auditFrequency).toBe('Biennial');
      expect(result.suggestedAuditYear).toBe(new Date().getFullYear() + 2);
    });

    it('should adjust velocity downwards when riskVelocity is Decreasing', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 3.0,
        controlEffectiveness: 'Adequate',
        riskVelocity: 'Decreasing',
      };

      const result = service.calculate(input);
      expect(result.inherentRiskScore).toBe(3.0);
      // residual = 3.0 * 0.75 = 2.25, velocity -0.2 = 2.05 -> Low
      expect(result.riskLevel).toBe('Low');
    });
  });

  describe('THUCTE Scoring Model', () => {
    it('should calculate from Impact + Likelihood detail scores', () => {
      const input: UnifiedRiskCalculationInput = {
        impactScores: [
          { component: 'Tài chính', weight: 0.25, score: 5 },
          { component: 'Pháp lý/tuân thủ', weight: 0.25, score: 5 },
          { component: 'Khách hàng/danh tiếng', weight: 0.15, score: 4 },
          { component: 'Hoạt động/resilience', weight: 0.2, score: 4 },
          { component: 'Dữ liệu/CNTT', weight: 0.15, score: 4 },
        ],
        likelihoodScores: [
          { component: 'Tần suất/phơi nhiễm', weight: 0.35, score: 4 },
          { component: 'Lịch sử sự cố/lỗi', weight: 0.25, score: 4 },
          { component: 'Mức độ thay đổi', weight: 0.2, score: 5 },
          { component: 'KRI/cảnh báo sớm', weight: 0.2, score: 4 },
        ],
        designEffectiveness: 0.5,
        operatingEffectiveness: 0.5,
      };

      const result = service.calculate(input);

      // Impact: 0.25*5 + 0.25*5 + 0.15*4 + 0.20*4 + 0.15*4 = 1.25+1.25+0.6+0.8+0.6 = 4.5
      expect(result.impactComposite).toBeCloseTo(4.5, 1);

      // Likelihood: 0.35*4 + 0.25*4 + 0.20*5 + 0.20*4 = 1.4+1+1+0.8 = 4.2
      expect(result.likelihoodComposite).toBeCloseTo(4.2, 1);

      // Inherent = (4.5 + 4.2) / 2 = 4.35
      expect(result.inherentRiskScore).toBeCloseTo(4.35, 1);

      // CE = 0.4*0.5 + 0.6*0.5 = 0.5
      expect(result.designEffectiveness).toBe(0.5);
      expect(result.operatingEffectiveness).toBe(0.5);

      // Residual = 4.35 * (1 - 0.5) = 2.175
      expect(result.residualRiskScore).toBeCloseTo(2.18, 1);
      expect(result.riskLevel).toBe('Low');
    });

    it('should apply Design/Operating Effectiveness correctly', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 4.0,
        designEffectiveness: 1, // Full design effectiveness
        operatingEffectiveness: 0, // No operating effectiveness
      };

      const result = service.calculate(input);
      // CE = 0.4*1 + 0.6*0 = 0.4
      expect(result.controlMultiplier).toBeCloseTo(0.6, 2);
      // Residual = 4.0 * (1 - 0.4) = 2.4
      expect(result.residualRiskScore).toBeCloseTo(2.4, 1);
    });

    it('should apply modifiers: recurring × overdue × emerging', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 4.0,
        designEffectiveness: 0.5,
        operatingEffectiveness: 0.5,
        isRecurring: true, // ×1.2
        isOverdueCritical: true, // ×1.15
        isEmergingRisk: true, // ×1.1
      };

      const result = service.calculate(input);
      // CE = 0.4*0.5 + 0.6*0.5 = 0.5
      // Residual = 4.0 * 0.5 = 2.0
      expect(result.residualRiskScore).toBeCloseTo(2.0, 1);

      // Modifier = 1.2 * 1.15 * 1.1 = 1.518
      expect(result.modifierScore).toBeCloseTo(1.52, 1);

      // Adjusted = 2.0 * 1.518 = 3.036
      expect(result.adjustedResidualScore).toBeCloseTo(3.04, 1);

      // 3.04 >= 2.4 → Medium
      expect(result.riskLevel).toBe('Medium');
    });

    it('should cap adjusted residual at 5.0', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 5.0,
        controlEffectiveness: 'Weak', // CE = 0
        isRecurring: true,
        isOverdueCritical: true,
        isEmergingRisk: true,
      };

      const result = service.calculate(input);
      // Residual = 5.0 * 1.0 = 5.0 (CE=0 for Weak)
      // Adjusted = 5.0 * 1.518 = 7.59 → capped at 5.0
      expect(result.adjustedResidualScore).toBe(5.0);
      expect(result.riskLevel).toBe('Critical');
    });

    it('should produce correct riskBand classification', () => {
      // Test each band
      const lowInput: UnifiedRiskCalculationInput = {
        inherentRiskScore: 2.0,
        designEffectiveness: 1,
        operatingEffectiveness: 1,
      };
      expect(service.calculate(lowInput).riskBand).toBe('Xanh');

      const medInput: UnifiedRiskCalculationInput = {
        inherentRiskScore: 3.5,
        designEffectiveness: 0.5,
        operatingEffectiveness: 0.5,
      };
      expect(service.calculate(medInput).riskBand).toBe('Xanh'); // 3.5*0.5=1.75 -> Xanh

      const highInput: UnifiedRiskCalculationInput = {
        inherentRiskScore: 5.0,
        designEffectiveness: 0,
        operatingEffectiveness: 0,
      };
      expect(service.calculate(highInput).riskBand).toBe('Đỏ'); // 5.0*1 = 5.0 -> Đỏ
    });

    it('should not apply modifiers when all are false', () => {
      const input: UnifiedRiskCalculationInput = {
        inherentRiskScore: 3.0,
        designEffectiveness: 0.5,
        operatingEffectiveness: 0.5,
        isRecurring: false,
        isOverdueCritical: false,
        isEmergingRisk: false,
      };

      const result = service.calculate(input);
      expect(result.modifierScore).toBe(1.0);
      expect(result.adjustedResidualScore).toBe(result.residualRiskScore);
    });

    it('should include impactScores and likelihoodScores in result', () => {
      const input: UnifiedRiskCalculationInput = {
        impactScores: [{ component: 'Tài chính', weight: 0.25, score: 4 }],
        likelihoodScores: [
          { component: 'Tần suất/phơi nhiễm', weight: 0.35, score: 3 },
        ],
        designEffectiveness: 1,
        operatingEffectiveness: 1,
      };

      const result = service.calculate(input);
      expect(result.impactScores).toHaveLength(1);
      expect(result.impactScores[0].component).toBe('Tài chính');
      expect(result.likelihoodScores).toHaveLength(1);
      expect(result.likelihoodScores[0].component).toBe('Tần suất/phơi nhiễm');
    });
  });
});
