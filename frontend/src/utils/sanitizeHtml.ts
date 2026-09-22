import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted HTML strings using DOMPurify to prevent XSS (CWE-79).
 */
export const sanitizeHtml = (html?: string | null): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
};

export default sanitizeHtml;
