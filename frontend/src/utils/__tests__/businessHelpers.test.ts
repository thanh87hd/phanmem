import { describe, it, expect } from 'vitest';
import {
  getProgressColor,
  isLowRisk,
  getSampleAmount,
  AUDIT_STATUS_COLORS,
  RECOMMENDATION_STATUS_CONFIG,
} from '../businessHelpers';

describe('businessHelpers', () => {
  describe('getProgressColor', () => {
    it('returns red (#ff4d4f) for score < 40', () => {
      expect(getProgressColor(0)).toBe('#ff4d4f');
      expect(getProgressColor(39.9)).toBe('#ff4d4f');
      expect(getProgressColor(-10)).toBe('#ff4d4f');
    });

    it('returns orange (#fa8c16) for 40 <= score < 60', () => {
      expect(getProgressColor(40)).toBe('#fa8c16');
      expect(getProgressColor(59)).toBe('#fa8c16');
    });

    it('returns yellow/gold (#faad14) for 60 <= score < 75', () => {
      expect(getProgressColor(60)).toBe('#faad14');
      expect(getProgressColor(74.9)).toBe('#faad14');
    });

    it('returns lime (#a0d911) for 75 <= score < 90', () => {
      expect(getProgressColor(75)).toBe('#a0d911');
      expect(getProgressColor(89.9)).toBe('#a0d911');
    });

    it('returns green (#52c41a) for score >= 90', () => {
      expect(getProgressColor(90)).toBe('#52c41a');
      expect(getProgressColor(100)).toBe('#52c41a');
      expect(getProgressColor(150)).toBe('#52c41a');
    });
  });

  describe('isLowRisk', () => {
    it('returns false for falsy or unassessed values', () => {
      expect(isLowRisk(null)).toBe(false);
      expect(isLowRisk(undefined)).toBe(false);
      expect(isLowRisk('')).toBe(false);
      expect(isLowRisk('Unassessed')).toBe(false);
      expect(isLowRisk('Chưa đánh giá')).toBe(false);
    });

    it('returns true for low risk variants', () => {
      expect(isLowRisk('Low')).toBe(true);
      expect(isLowRisk('low')).toBe(true);
      expect(isLowRisk('Rủi ro thấp')).toBe(true);
      expect(isLowRisk('thấp')).toBe(true);
      expect(isLowRisk('Hạng 1')).toBe(true);
      expect(isLowRisk('Hạng 2')).toBe(true);
      expect(isLowRisk('Chi nhánh hạng 1')).toBe(true);
      expect(isLowRisk('Chi nhánh hạng 2')).toBe(true);
    });

    it('returns false for medium, high, and critical risks', () => {
      expect(isLowRisk('High')).toBe(false);
      expect(isLowRisk('Cao')).toBe(false);
      expect(isLowRisk('Medium')).toBe(false);
      expect(isLowRisk('Trung bình')).toBe(false);
      expect(isLowRisk('Critical')).toBe(false);
      expect(isLowRisk('Hạng 3')).toBe(false);
      expect(isLowRisk('Hạng 4')).toBe(false);
      expect(isLowRisk('Hạng 5')).toBe(false);
    });
  });

  describe('getSampleAmount', () => {
    it('returns 0 for falsy input', () => {
      expect(getSampleAmount(null)).toBe(0);
      expect(getSampleAmount(undefined)).toBe(0);
    });

    it('extracts loanAmount when present', () => {
      expect(getSampleAmount({ loanAmount: 5000000 })).toBe(5000000);
    });

    it('extracts nested sampleData fields in priority order', () => {
      expect(
        getSampleAmount({
          sampleData: { outstandingBalance: 3000000, transactionAmount: 2000000 },
        }),
      ).toBe(3000000);

      expect(
        getSampleAmount({
          sampleData: { transactionAmount: 2000000, amount: 1000000 },
        }),
      ).toBe(2000000);

      expect(
        getSampleAmount({
          sampleData: { amount: 1000000 },
        }),
      ).toBe(1000000);
    });

    it('extracts top-level amount if loanAmount and sampleData are absent', () => {
      expect(getSampleAmount({ amount: 750000 })).toBe(750000);
    });

    it('handles numeric string conversion', () => {
      expect(getSampleAmount({ loanAmount: '4500000' })).toBe(4500000);
    });

    it('returns 0 for NaN or invalid values', () => {
      expect(getSampleAmount({ loanAmount: 'invalid' })).toBe(0);
    });
  });

  describe('status mappings integrity', () => {
    it('AUDIT_STATUS_COLORS maps standard statuses correctly', () => {
      expect(AUDIT_STATUS_COLORS.Draft).toBe('default');
      expect(AUDIT_STATUS_COLORS.PendingApproval).toBe('processing');
      expect(AUDIT_STATUS_COLORS.Approved).toBe('success');
      expect(AUDIT_STATUS_COLORS.Rejected).toBe('error');
    });

    it('RECOMMENDATION_STATUS_CONFIG contains all expected lifecycles', () => {
      expect(RECOMMENDATION_STATUS_CONFIG.NotStarted.label).toBe('Chưa thực hiện');
      expect(RECOMMENDATION_STATUS_CONFIG.Completed.color).toBe('success');
      expect(RECOMMENDATION_STATUS_CONFIG.Overdue.color).toBe('error');
    });
  });
});
