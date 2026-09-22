import { describe, it, expect } from 'vitest';
import {
  calculateResidualRisk,
  RISK_GROUPS,
  CAUSE_TYPES,
  CONTROL_QUALITIES,
  INHERENT_RISKS,
  RISK_CATEGORIES,
  CUSTOMER_TYPES,
  AUDITEE_OPINIONS,
  VIOLATION_HISTORIES,
  DEFAULT_PTD_PROCESSES,
  RISK_LEVEL_OPTIONS,
  REMEDIATION_STATUS_OPTIONS,
} from '../../constants/auditConstants';

describe('auditConstants', () => {
  // ─────────────────────────────────────────────────────────────
  // CG-05: calculateResidualRisk tính đúng theo ma trận IIA/VSA230
  // ─────────────────────────────────────────────────────────────
  describe('calculateResidualRisk', () => {
    // Cố hữu CAO
    it('Cao + Rất tốt → Trung bình', () => {
      expect(calculateResidualRisk('Cao', 'Rất tốt')).toBe('Trung bình');
    });
    it('Cao + Tốt → Trung bình', () => {
      expect(calculateResidualRisk('Cao', 'Tốt')).toBe('Trung bình');
    });
    it('Cao + Trung bình → Cao (kiểm soát không đủ tốt)', () => {
      expect(calculateResidualRisk('Cao', 'Trung bình')).toBe('Cao');
    });
    it('Cao + Yếu → Cao', () => {
      expect(calculateResidualRisk('Cao', 'Yếu')).toBe('Cao');
    });
    it('Cao + Rất yếu → Cao', () => {
      expect(calculateResidualRisk('Cao', 'Rất yếu')).toBe('Cao');
    });

    // Cố hữu TRUNG BÌNH
    it('Trung bình + Tốt → Thấp', () => {
      expect(calculateResidualRisk('Trung bình', 'Tốt')).toBe('Thấp');
    });
    it('Trung bình + Rất tốt → Thấp', () => {
      expect(calculateResidualRisk('Trung bình', 'Rất tốt')).toBe('Thấp');
    });
    it('Trung bình + Trung bình → Trung bình', () => {
      expect(calculateResidualRisk('Trung bình', 'Trung bình')).toBe('Trung bình');
    });
    it('Trung bình + Yếu → Cao', () => {
      expect(calculateResidualRisk('Trung bình', 'Yếu')).toBe('Cao');
    });

    // Cố hữu THẤP
    it('Thấp + Tốt → Thấp', () => {
      expect(calculateResidualRisk('Thấp', 'Tốt')).toBe('Thấp');
    });
    it('Thấp + Trung bình → Thấp', () => {
      expect(calculateResidualRisk('Thấp', 'Trung bình')).toBe('Thấp');
    });
    it('Thấp + Yếu → Trung bình', () => {
      expect(calculateResidualRisk('Thấp', 'Yếu')).toBe('Trung bình');
    });

    // English aliases
    it('High + good control → Trung bình (English alias)', () => {
      expect(calculateResidualRisk('High', 'Rất tốt')).toBe('Trung bình');
    });
    it('Medium + poor control → Cao (English alias)', () => {
      expect(calculateResidualRisk('Medium', 'Yếu')).toBe('Cao');
    });
    it('Low + weak → Trung bình (English alias)', () => {
      expect(calculateResidualRisk('Low', 'Yếu')).toBe('Trung bình');
    });
    it('Critical + any → Cao fallback', () => {
      expect(calculateResidualRisk('Critical', 'Trung bình')).toBe('Cao');
    });

    // Edge cases
    it('empty strings → fallback Trung bình', () => {
      expect(calculateResidualRisk('', '')).toBe('Trung bình');
    });
    it('null-ish → fallback Trung bình', () => {
      expect(calculateResidualRisk(null as any, undefined as any)).toBe('Trung bình');
    });
    it('unknown values → fallback Trung bình', () => {
      expect(calculateResidualRisk('Unknown', 'Unknown')).toBe('Trung bình');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Constants integrity checks
  // ─────────────────────────────────────────────────────────────
  describe('constant arrays integrity', () => {
    it('RISK_GROUPS has 9 credit risk groups', () => {
      expect(RISK_GROUPS).toHaveLength(9);
      expect(RISK_GROUPS[0]).toContain('01.');
      expect(RISK_GROUPS[8]).toContain('09.');
    });

    it('CAUSE_TYPES has 7 cause types', () => {
      expect(CAUSE_TYPES).toHaveLength(7);
    });

    it('CONTROL_QUALITIES has 5 levels', () => {
      expect(CONTROL_QUALITIES).toEqual(['Rất tốt', 'Tốt', 'Trung bình', 'Yếu', 'Rất yếu']);
    });

    it('INHERENT_RISKS has 3 levels', () => {
      expect(INHERENT_RISKS).toEqual(['Cao', 'Trung bình', 'Thấp']);
    });

    it('RISK_CATEGORIES has 3 categories', () => {
      expect(RISK_CATEGORIES).toHaveLength(3);
    });

    it('CUSTOMER_TYPES has Cá nhân and Doanh nghiệp', () => {
      expect(CUSTOMER_TYPES).toEqual(['Cá nhân', 'Doanh nghiệp']);
    });

    it('AUDITEE_OPINIONS has 2 options', () => {
      expect(AUDITEE_OPINIONS).toEqual(['Đồng ý', 'Không đồng ý']);
    });

    it('VIOLATION_HISTORIES has 3 levels', () => {
      expect(VIOLATION_HISTORIES).toEqual(['Lần đầu', 'Lặp lại', 'Hệ thống']);
    });

    it('DEFAULT_PTD_PROCESSES has at least 10 processes', () => {
      expect(DEFAULT_PTD_PROCESSES.length).toBeGreaterThanOrEqual(10);
    });

    it('RISK_LEVEL_OPTIONS has 4 options with label/value', () => {
      expect(RISK_LEVEL_OPTIONS).toHaveLength(4);
      RISK_LEVEL_OPTIONS.forEach((opt) => {
        expect(opt).toHaveProperty('label');
        expect(opt).toHaveProperty('value');
      });
    });

    it('REMEDIATION_STATUS_OPTIONS has 3 options', () => {
      expect(REMEDIATION_STATUS_OPTIONS).toHaveLength(3);
      expect(REMEDIATION_STATUS_OPTIONS.map((o) => o.value)).toEqual(['FAIL', 'EXCEPTION', 'PASS']);
    });
  });
});
