/**
 * Xem trước tệp đính kèm/bằng chứng ngay trong trình duyệt (UAT TC-WP-04).
 *
 * BỐI CẢNH LỖI ĐÃ SỬA:
 * UI Giấy tờ làm việc chỉ có nút "Tải" và luôn gọi URL tải xuống, nên Tester
 * không thể xem bằng chứng mà không tải về rồi mở bằng phần mềm ngoài. Trong
 * khi đó backend ĐÃ hỗ trợ `Content-Disposition: inline` qua tham số
 * `?inline=true` (cả `/file-assets/:id/download` và `/evidences/:id/download`)
 * — tức là thiếu ở tầng UI, không phải thiếu năng lực backend.
 */

/** Phần mở rộng trình duyệt hiển thị trực tiếp được (không cần plugin). */
const PREVIEWABLE_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'txt',
  'log',
  'csv',
  'json',
  'xml',
  'html',
  'htm',
];

/**
 * Định dạng Office (`.docx`, `.xlsx`) KHÔNG xem trước được trên trình duyệt —
 * mở tab sẽ ra trang trắng hoặc tải xuống, gây hiểu nhầm là lỗi.
 */
export function isPreviewableFile(fileNameOrUrl?: string | null): boolean {
  if (!fileNameOrUrl) return false;
  // Bỏ query string/hash rồi lấy phần mở rộng cuối cùng.
  const cleaned = fileNameOrUrl.split(/[?#]/)[0];
  const match = /\.([a-z0-9]+)$/i.exec(cleaned);
  if (!match) return false;
  return PREVIEWABLE_EXTENSIONS.includes(match[1].toLowerCase());
}

/**
 * Dựng URL xem trước từ URL tải xuống.
 *
 * Giữ nguyên mọi tham số sẵn có và chỉ đặt `inline=true`. Không hard-code
 * đường dẫn nên dùng được cho cả `/api/evidences/:id/download` lẫn
 * `/api/file-assets/:id/download`.
 */
export function buildInlinePreviewUrl(fileUrl?: string | null): string {
  if (!fileUrl) return '';
  const [base, hash = ''] = fileUrl.split('#');
  const [path, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  params.set('inline', 'true');
  const qs = params.toString();
  return `${path}?${qs}${hash ? `#${hash}` : ''}`;
}

/** Tiện ích cho component: gộp kiểm tra định dạng + dựng URL. */
export function getAttachmentPreview(
  attachment: { name?: string; fileUrl?: string } | null | undefined,
): { canPreview: boolean; url: string } {
  if (!attachment) return { canPreview: false, url: '' };
  const canPreview = isPreviewableFile(attachment.name || attachment.fileUrl);
  return {
    canPreview,
    url: canPreview ? buildInlinePreviewUrl(attachment.fileUrl) : '',
  };
}
