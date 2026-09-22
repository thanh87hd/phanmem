import { describe, it, expect } from 'vitest';
import { formatCurrencyVND, formatDateVN, formatNumberVN } from '../formatters';

describe('formatters', () => {
  describe('formatCurrencyVND', () => {
    it('handles empty, null, or undefined values', () => {
      expect(formatCurrencyVND(null)).toBe('0 ₫');
      expect(formatCurrencyVND(undefined)).toBe('0 ₫');
      expect(formatCurrencyVND('')).toBe('0 ₫');
    });

    it('formats numeric values with VND currency symbol', () => {
      const result = formatCurrencyVND(1000000);
      // Normalized check to avoid non-breaking space difference in Intl formatting across Node versions
      expect(result.replace(/\s+/g, ' ')).toMatch(/1\.000\.000\s*₫/);
    });

    it('handles string numbers with commas', () => {
      const result = formatCurrencyVND('1,500,000');
      expect(result.replace(/\s+/g, ' ')).toMatch(/1\.500\.000\s*₫/);
    });

    it('returns 0 ₫ for NaN string', () => {
      expect(formatCurrencyVND('invalid-number')).toBe('0 ₫');
    });
  });

  describe('formatDateVN', () => {
    it('returns "-" for null, undefined or empty string', () => {
      expect(formatDateVN(null)).toBe('-');
      expect(formatDateVN(undefined)).toBe('-');
      expect(formatDateVN('')).toBe('-');
    });

    it('formats valid Date or date string to DD/MM/YYYY', () => {
      const d = new Date(2025, 4, 15); // May 15, 2025
      expect(formatDateVN(d)).toBe('15/05/2025');
    });

    it('returns original input if date parsing fails', () => {
      expect(formatDateVN('not-a-date')).toBe('not-a-date');
    });
  });

  describe('formatNumberVN', () => {
    it('handles empty, null, or undefined values', () => {
      expect(formatNumberVN(null)).toBe('0');
      expect(formatNumberVN(undefined)).toBe('0');
      expect(formatNumberVN('')).toBe('0');
    });

    it('formats numeric value with dot separators in vi-VN locale', () => {
      expect(formatNumberVN(1234567)).toBe('1.234.567');
      expect(formatNumberVN('987,654')).toBe('987.654');
    });
  });
});
