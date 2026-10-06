import { createHash } from 'crypto';

/**
 * Tiện ích toàn vẹn (integrity) cho nhật ký kiểm toán — UAT TC-SYS-05.
 *
 * ============================ DẠNG CHUẨN TẮC (CANONICAL FORM) ============================
 * Mã băm là SHA-256 (hex, chữ thường, 64 ký tự) tính trên ĐÚNG chuỗi sau:
 *
 *   JSON.stringify({
 *     action:     <string|null>,
 *     resource:   <string|null>,
 *     resourceId: <string|null>,
 *     userId:     <number|null>,
 *     username:   <string|null>,
 *     oldValue:   <string|null>,
 *     newValue:   <string|null>,
 *     ipAddress:  <string|null>,
 *     userAgent:  <string|null>,
 *   })
 *
 * Quy ước bắt buộc để bảo đảm tính tất định (deterministic):
 *  - Đúng 9 khoá, ĐÚNG THỨ TỰ như trên (JSON.stringify giữ nguyên thứ tự chèn khoá).
 *  - `null` và `undefined` đều được chuẩn hoá thành `null` (JSON literal) ⇒ không phụ
 *    thuộc vào việc trường đó bị bỏ trống hay bị set null.
 *  - `oldValue`/`newValue` là chuỗi ĐÃ tuần tự hoá đúng như khi lưu xuống DB (xem
 *    `serializeAuditValue`), không phải object gốc ⇒ băm lại từ bản ghi trong DB cho
 *    ra cùng kết quả.
 *  - `resourceId` luôn ở dạng chuỗi (service đã `.toString()` trước khi băm).
 *  - Chuỗi được mã hoá UTF-8 trước khi băm.
 *
 * ============================ PHẠM VI BẢO VỆ ============================
 * `id` và `createdAt` do DB sinh (không có trước khi INSERT) nên KHÔNG tham gia mã băm.
 * Hệ quả — đã chấp nhận và ghi nhận:
 *  - Mã băm theo từng dòng chỉ chứng minh NỘI DUNG của dòng đó không bị sửa.
 *  - KHÔNG phát hiện được việc XOÁ một dòng, ĐỔI THỨ TỰ dòng, hay chèn/xoá cả lô.
 *  - Kẻ có quyền ghi DB vẫn có thể xoá dòng rồi tính lại băm cho các dòng còn lại.
 *  ⇒ Bất biến đầy đủ cần WORM/archival (xem báo cáo); rủi ro còn lại được chấp nhận.
 */

export interface HashableAuditLogEntry {
  action?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  userId?: number | null;
  username?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Quy tắc tuần tự hoá `oldValue`/`newValue` (sửa lỗi double-encode + mất giá trị falsy):
 *  - `undefined` / `null`      → KHÔNG ghi (coi như không có giá trị).
 *  - `string`                  → giữ NGUYÊN VĂN (chuỗi JSON đã sẵn không bị bọc nháy kép
 *                                lần hai ⇒ không còn double-encode).
 *  - `object` / `array`        → `JSON.stringify`.
 *  - `number` / `boolean` / ... → `String(value)` ⇒ giữ được `0`, `false` (trước đây bị
 *                                `? :` coi là falsy nên âm thầm mất).
 */
export function serializeAuditValue(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Dựng chuỗi chuẩn tắc (canonical) — xem mô tả ở đầu file. */
export function buildCanonicalAuditLogString(
  entry: HashableAuditLogEntry,
): string {
  return JSON.stringify({
    action: entry.action ?? null,
    resource: entry.resource ?? null,
    resourceId: entry.resourceId ?? null,
    userId: entry.userId ?? null,
    username: entry.username ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
  });
}

/** Mã băm SHA-256 (hex, 64 ký tự) của một bản ghi nhật ký kiểm toán. */
export function computeAuditLogHash(entry: HashableAuditLogEntry): string {
  return createHash('sha256')
    .update(buildCanonicalAuditLogString(entry), 'utf8')
    .digest('hex');
}
