import { describe, it, expect } from 'vitest';
import { calculateResidualRisk } from '../auditConstants';

describe('auditRiskCalculator (VSA 230 Risk Matrix)', () => {
  const cases: Array<{
    inh: string;
    qual: string;
    expected: string;
    desc: string;
  }> = [
    { inh: 'Cao', qual: 'Tốt', expected: 'Trung bình', desc: 'Inherent Cao + Control Tốt => Residual Trung bình' },
    { inh: 'Cao', qual: 'Rất tốt', expected: 'Trung bình', desc: 'Inherent Cao + Control Rất tốt => Residual Trung bình' },
    { inh: 'Cao', qual: 'Trung bình', expected: 'Cao', desc: 'Inherent Cao + Control Trung bình => Residual Cao' },
    { inh: 'Cao', qual: 'Yếu', expected: 'Cao', desc: 'Inherent Cao + Control Yếu => Residual Cao' },
    { inh: 'Cao', qual: 'Rất yếu', expected: 'Cao', desc: 'Inherent Cao + Control Rất yếu => Residual Cao' },
    { inh: 'Trung bình', qual: 'Tốt', expected: 'Thấp', desc: 'Inherent Trung bình + Control Tốt => Residual Thấp' },
    { inh: 'Trung bình', qual: 'Yếu', expected: 'Cao', desc: 'Inherent Trung bình + Control Yếu => Residual Cao' },
    { inh: 'Trung bình', qual: 'Trung bình', expected: 'Trung bình', desc: 'Inherent Trung bình + Control Trung bình => Residual Trung bình' },
    { inh: 'Thấp', qual: 'Yếu', expected: 'Trung bình', desc: 'Inherent Thấp + Control Yếu => Residual Trung bình' },
    { inh: 'Thấp', qual: 'Tốt', expected: 'Thấp', desc: 'Inherent Thấp + Control Tốt => Residual Thấp' },
    { inh: 'CRITICAL', qual: 'Tốt', expected: 'Trung bình', desc: 'English case: Critical + Tốt => Trung bình' },
    { inh: '', qual: '', expected: 'Trung bình', desc: 'Default fallback for empty inputs' },
  ];

  cases.forEach((tc) => {
    it(`should calculate correctly: ${tc.desc}`, () => {
      const actual = calculateResidualRisk(tc.inh, tc.qual);
      expect(actual).toBe(tc.expected);
    });
  });
});
