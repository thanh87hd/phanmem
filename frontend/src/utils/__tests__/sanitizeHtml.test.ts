import { describe, it, expect, vi } from 'vitest';
import { sanitizeHtml } from '../sanitizeHtml';

// DOMPurify uses the browser DOM; in jsdom env it works out of the box
describe('sanitizeHtml', () => {
  // SH-01: XSS prevention
  describe('XSS prevention', () => {
    it('strips <script> tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('strips onclick handlers', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">Click me</div>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('strips javascript: protocol in href', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Link</a>');
      expect(result).not.toContain('javascript:');
    });

    it('strips <img onerror>', () => {
      const result = sanitizeHtml('<img src=x onerror="alert(1)">');
      expect(result).not.toContain('onerror');
    });

    it('strips <iframe> tags', () => {
      const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
    });

    it('strips SVG-based XSS', () => {
      const result = sanitizeHtml('<svg onload="alert(1)"></svg>');
      expect(result).not.toContain('onload');
    });
  });

  // SH-02: Preserve safe HTML
  describe('preserves safe HTML', () => {
    it('preserves <b>, <i>, <u>, <em>, <strong>', () => {
      const input = '<b>Bold</b> <i>Italic</i> <u>Underline</u> <em>Em</em> <strong>Strong</strong>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
      expect(result).toContain('<u>');
      expect(result).toContain('<em>');
      expect(result).toContain('<strong>');
    });

    it('preserves <p>, <br>, <div>', () => {
      const input = '<p>Paragraph</p><br><div>Block</div>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<br>');
      expect(result).toContain('<div>');
    });

    it('preserves <ul>, <ol>, <li>', () => {
      const input = '<ul><li>Item 1</li></ul><ol><li>Item 2</li></ol>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('<ol>');
    });

    it('preserves <a> with safe href', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Link');
    });

    it('preserves <table> elements', () => {
      const input = '<table><tr><td>Cell</td></tr></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('returns empty string for null', () => {
      expect(sanitizeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('preserves plain text without changes', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });

    it('handles Vietnamese text correctly', () => {
      const input = '<p>Kiểm toán nội bộ ngân hàng</p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('Kiểm toán nội bộ ngân hàng');
    });
  });
});
