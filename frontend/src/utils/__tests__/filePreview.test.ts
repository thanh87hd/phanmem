import { describe, it, expect } from 'vitest';
import {
  isPreviewableFile,
  buildInlinePreviewUrl,
  getAttachmentPreview,
} from '../filePreview';

/**
 * UAT TC-WP-04 — "Không có nút xem trước bằng chứng".
 *
 * Backend đã hỗ trợ `?inline=true` (trả Content-Disposition: inline) nhưng UI
 * chỉ có nút "Tải" và luôn gọi URL tải xuống. Các test dưới đây khoá lại hợp
 * đồng: URL xem trước PHẢI mang `inline=true`, và định dạng Office phải bị ẩn
 * nút để tránh tab trắng.
 */
describe('isPreviewableFile (TC-WP-04)', () => {
  it('nhận các định dạng trình duyệt xem trước được', () => {
    for (const f of [
      'bang-chung.pdf',
      'anh.png',
      'anh.JPG',
      'scan.jpeg',
      'bieu-mau.xlsx'.replace('xlsx', 'csv'),
      'ghi-chu.txt',
      'du-lieu.json',
    ]) {
      expect(isPreviewableFile(f)).toBe(true);
    }
  });

  it('loại trừ định dạng Office không xem trước được trên trình duyệt', () => {
    expect(isPreviewableFile('bien-ban.docx')).toBe(false);
    expect(isPreviewableFile('so-lieu.xlsx')).toBe(false);
    expect(isPreviewableFile('trinh-bay.pptx')).toBe(false);
  });

  it('bỏ qua query string và hash khi xét phần mở rộng', () => {
    expect(isPreviewableFile('/api/evidences/12/download?inline=true')).toBe(
      false,
    );
    expect(isPreviewableFile('/api/evidences/12/bang-chung.pdf?x=1')).toBe(true);
  });

  it('đầu vào rỗng/không xác định → false (không ném lỗi)', () => {
    expect(isPreviewableFile('')).toBe(false);
    expect(isPreviewableFile(null)).toBe(false);
    expect(isPreviewableFile(undefined)).toBe(false);
    expect(isPreviewableFile('khong-co-phan-mo-rong')).toBe(false);
  });
});

describe('buildInlinePreviewUrl (TC-WP-04)', () => {
  it('thêm inline=true vào URL không có query', () => {
    expect(buildInlinePreviewUrl('/api/evidences/12/download')).toBe(
      '/api/evidences/12/download?inline=true',
    );
  });

  it('giữ nguyên tham số sẵn có', () => {
    expect(buildInlinePreviewUrl('/api/file-assets/3/download?v=2')).toBe(
      '/api/file-assets/3/download?v=2&inline=true',
    );
  });

  it('ghi đè inline cũ thay vì nhân đôi tham số', () => {
    const url = buildInlinePreviewUrl('/api/evidences/12/download?inline=false');
    expect(url).toBe('/api/evidences/12/download?inline=true');
    expect(url.match(/inline=/g)).toHaveLength(1);
  });

  it('giữ nguyên hash', () => {
    expect(buildInlinePreviewUrl('/api/evidences/12/download#page=2')).toBe(
      '/api/evidences/12/download?inline=true#page=2',
    );
  });

  it('đầu vào rỗng → chuỗi rỗng', () => {
    expect(buildInlinePreviewUrl('')).toBe('');
    expect(buildInlinePreviewUrl(null)).toBe('');
  });
});

describe('getAttachmentPreview (TC-WP-04)', () => {
  it('PDF → cho xem trước với URL inline', () => {
    expect(
      getAttachmentPreview({
        name: 'bang-chung.pdf',
        fileUrl: '/api/evidences/9/download',
      }),
    ).toEqual({
      canPreview: true,
      url: '/api/evidences/9/download?inline=true',
    });
  });

  it('DOCX → KHÔNG cho xem trước và không dựng URL', () => {
    expect(
      getAttachmentPreview({
        name: 'bien-ban.docx',
        fileUrl: '/api/evidences/9/download',
      }),
    ).toEqual({ canPreview: false, url: '' });
  });

  it('thiếu tên tệp thì suy ra từ URL', () => {
    expect(
      getAttachmentPreview({ fileUrl: '/api/evidences/9/anh.png' }).canPreview,
    ).toBe(true);
  });

  it('đầu vào rỗng → không xem trước', () => {
    expect(getAttachmentPreview(null)).toEqual({ canPreview: false, url: '' });
    expect(getAttachmentPreview({})).toEqual({ canPreview: false, url: '' });
  });
});
