import { escapeLikeString, toLikePattern } from './sql-escape.util';

describe('sql-escape.util', () => {
  describe('escapeLikeString', () => {
    it('should return empty string for null, undefined, or empty string', () => {
      expect(escapeLikeString(null)).toBe('');
      expect(escapeLikeString(undefined)).toBe('');
      expect(escapeLikeString('')).toBe('');
    });

    it('should leave normal strings unchanged', () => {
      expect(escapeLikeString('normal search text 123')).toBe('normal search text 123');
      expect(escapeLikeString('Tiếng Việt có dấu')).toBe('Tiếng Việt có dấu');
    });

    it('should escape backslashes first', () => {
      expect(escapeLikeString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape percentage signs (%)', () => {
      expect(escapeLikeString('100% discount')).toBe('100\\% discount');
      expect(escapeLikeString('%admin%')).toBe('\\%admin\\%');
    });

    it('should escape underscores (_)', () => {
      expect(escapeLikeString('user_name')).toBe('user\\_name');
      expect(escapeLikeString('___')).toBe('\\_\\_\\_');
    });

    it('should escape combination of special characters', () => {
      expect(escapeLikeString('user_%\\_test')).toBe('user\\_\\%\\\\\\_test');
    });
  });

  describe('toLikePattern', () => {
    it('should return empty string for empty input', () => {
      expect(toLikePattern('')).toBe('');
      expect(toLikePattern(null)).toBe('');
      expect(toLikePattern(undefined)).toBe('');
    });

    it('should wrap in % on both sides by default', () => {
      expect(toLikePattern('abc')).toBe('%abc%');
      expect(toLikePattern('test%123')).toBe('%test\\%123%');
    });

    it('should support starts mode', () => {
      expect(toLikePattern('prefix', 'starts')).toBe('prefix%');
      expect(toLikePattern('pre_fix%', 'starts')).toBe('pre\\_fix\\%%');
    });

    it('should support ends mode', () => {
      expect(toLikePattern('suffix', 'ends')).toBe('%suffix');
      expect(toLikePattern('suf_fix%', 'ends')).toBe('%suf\\_fix\\%');
    });
  });
});
