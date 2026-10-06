/**
 * Chuẩn hoá trạng thái Kiến nghị khắc phục — chống lệch enum giữa DB và UI.
 *
 * ⚠️ BỐI CẢNH LỖI ĐÃ SỬA (TC-AUD-04):
 * Bảng `recommendations` trên production còn dữ liệu cũ với `status` bằng
 * TIẾNG VIỆT ('Đã hoàn thành', 'Chưa khắc phục', 'Đã khắc phục một phần'),
 * trong khi ứng dụng dùng enum tiếng Anh. Hệ quả quan sát được trên cổng
 * Đơn vị được kiểm toán:
 *  - `statusConfig[status]` → `undefined` ⇒ Tag trạng thái trắng/không nhãn.
 *  - Nút "Cập nhật tiến độ" chỉ render khi `status === 'NotStarted'` hoặc
 *    `['InProgress','Overdue'].includes(status)` ⇒ KHÔNG BAO GIỜ hiện.
 *
 * Migration `1787941000000-NormalizeRecommendationStatus` đã chuẩn hoá dữ liệu
 * hiện có, nhưng lớp phòng thủ này vẫn cần thiết vì:
 *  1. Dữ liệu mới có thể lọt vào từ tích hợp/import bên ngoài.
 *  2. Migration có thể chưa chạy (pipeline giải nén dist TRƯỚC khi migrate).
 *  3. Các bản ghi cũ được phục vụ từ cache/backup.
 */

export const RECOMMENDATION_STATUSES = [
  'NotStarted',
  'InProgress',
  'Completed',
  'Overdue',
  'Verified',
] as const;

export type NormalizedRecommendationStatus =
  (typeof RECOMMENDATION_STATUSES)[number];

/**
 * Ánh xạ nhãn tiếng Việt cũ → enum tiếng Anh.
 * Khoá được so khớp sau khi chuẩn hoá (bỏ dấu, viết thường, gộp khoảng trắng).
 */
const LEGACY_STATUS_MAP: Record<string, NormalizedRecommendationStatus> = {
  'da hoan thanh': 'Completed',
  'hoan thanh': 'Completed',
  'da bao cao xong': 'Completed',
  'chua khac phuc': 'NotStarted',
  'chua bat dau': 'NotStarted',
  'chua thuc hien': 'NotStarted',
  'da khac phuc mot phan': 'InProgress',
  'dang thuc hien': 'InProgress',
  'dang khac phuc': 'InProgress',
  'qua han': 'Overdue',
  'da xac nhan': 'Verified',
  'da dong': 'Verified',
};

/** Bỏ dấu tiếng Việt + chuẩn hoá khoảng trắng để so khớp nhãn cũ. */
function canonicalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trả về trạng thái enum hợp lệ cho một bản ghi kiến nghị.
 *
 * Thứ tự ưu tiên:
 *  1. `status` đã đúng enum → giữ nguyên (nguồn sự thật số 1).
 *  2. `status` là nhãn tiếng Việt cũ → ánh xạ.
 *  3. Suy ra từ `closureStatus` + `progressPercent` + `dueDate`.
 *  4. Mặc định `NotStarted`.
 */
export function normalizeRecommendationStatus(record: {
  status?: string | null;
  closureStatus?: string | null;
  progressPercent?: number | null;
  dueDate?: string | null;
}): NormalizedRecommendationStatus {
  if (!record) return 'NotStarted';

  const raw = (record.status ?? '').toString().trim();
  if ((RECOMMENDATION_STATUSES as readonly string[]).includes(raw)) {
    return raw as NormalizedRecommendationStatus;
  }

  const mapped = LEGACY_STATUS_MAP[canonicalize(raw)];
  if (mapped) return mapped;

  // Không nhận dạng được nhãn → suy ra từ nguồn sự thật số.
  //
  // ⚠️ CHỦ Ý KHÔNG suy ra 'Verified' từ `closureStatus === 'Closed'`:
  // nhãn tiếng Việt cũ rõ nghĩa hơn cờ đóng. Một kiến nghị 'Đã hoàn thành'
  // (progressPercent = 100) nhưng closureStatus còn 'Open' phải là 'Completed'
  // (ĐVĐKT báo xong, chờ KTV xác nhận) chứ KHÔNG phải 'Verified'.
  // Service `close()` luôn ghi status='Verified' cùng lúc với
  // closureStatus='Closed' nên không có bản ghi nào cần suy ra từ cờ đó.
  const progress = Number(record.progressPercent ?? 0);
  if (Number.isFinite(progress) && progress >= 100) return 'Completed';
  if (Number.isFinite(progress) && progress > 0) return 'InProgress';

  const due = record.dueDate ? new Date(record.dueDate) : null;
  if (due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
    return 'Overdue';
  }

  return 'NotStarted';
}

/**
 * Kiến nghị có được phép báo cáo tiến độ khắc phục hay không.
 *
 * Dùng CHUNG cho cả hai lối vào (bảng theo dõi kế hoạch và timeline kiến nghị)
 * để không còn tình trạng một chỗ hiện nút, chỗ khác thì không.
 */
export function canReportProgress(record: {
  status?: string | null;
  closureStatus?: string | null;
  progressPercent?: number | null;
  dueDate?: string | null;
}): boolean {
  if (!record) return false;
  if ((record.closureStatus ?? '') === 'Closed') return false;
  const status = normalizeRecommendationStatus(record);
  if (status === 'Verified') return false;
  return Number(record.progressPercent ?? 0) < 100;
}

/** Kiến nghị đã kết thúc vòng đời → không cho sửa. */
export function isRecommendationReadOnly(record: {
  status?: string | null;
  closureStatus?: string | null;
}): boolean {
  if (!record) return true;
  return (
    (record.closureStatus ?? '') === 'Closed' ||
    normalizeRecommendationStatus(record) === 'Verified'
  );
}
