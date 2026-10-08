/**
 * SQL / QueryBuilder Sanitization Utility
 * Cung cấp các hàm thoát ký tự đại diện trong câu truy vấn LIKE / ILIKE
 * nhằm phòng chống Wildcard Injection / ReDoS / Data Enumeration attacks.
 */

/**
 * Thoát các ký tự đặc biệt của LIKE / ILIKE:
 * '\' (escape char) -> '\\'
 * '%' (wildcard)   -> '\%'
 * '_' (single char) -> '\_'
 */
export function escapeLikeString(str: string | null | undefined): string {
  if (!str) {
    return '';
  }
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Chuyển chuỗi đầu vào thành chuỗi tìm kiếm LIKE an toàn đã được bọc ký tự đại diện
 * @param input Chuỗi tìm kiếm do người dùng nhập
 * @param mode 'both' (%input%), 'starts' (input%), 'ends' (%input)
 */
export function toLikePattern(
  input: string | null | undefined,
  mode: 'both' | 'starts' | 'ends' = 'both',
): string {
  const sanitized = escapeLikeString(input);
  if (!sanitized) {
    return '';
  }

  switch (mode) {
    case 'starts':
      return `${sanitized}%`;
    case 'ends':
      return `%${sanitized}`;
    case 'both':
    default:
      return `%${sanitized}%`;
  }
}
