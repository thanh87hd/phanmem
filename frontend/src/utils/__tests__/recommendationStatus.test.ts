import { describe, it, expect } from 'vitest';
import {
  normalizeRecommendationStatus,
  canReportProgress,
  isRecommendationReadOnly,
  RECOMMENDATION_STATUSES,
} from '../recommendationStatus';

/**
 * UAT TC-AUD-04 — cổng Đơn vị được kiểm toán hiển thị sai trạng thái và không
 * có nút "Cập nhật tiến độ".
 *
 * Bối cảnh: DB production còn `status` bằng TIẾNG VIỆT từ phiên bản cũ
 * ('Đã hoàn thành', 'Chưa khắc phục', 'Đã khắc phục một phần') trong khi app
 * dùng enum tiếng Anh. Hệ quả: `statusConfig[status]` → undefined (Tag trắng)
 * và điều kiện `record.status === 'NotStarted'` / `['InProgress','Overdue']
 * .includes(status)` luôn sai ⇒ nút không bao giờ render.
 */
describe('normalizeRecommendationStatus (TC-AUD-04)', () => {
  it('giữ nguyên giá trị đã đúng enum', () => {
    for (const s of RECOMMENDATION_STATUSES) {
      expect(normalizeRecommendationStatus({ status: s })).toBe(s);
    }
  });

  it('ánh xạ nhãn tiếng Việt cũ đang có trên production', () => {
    // Đây chính là 3 giá trị đo được ở production (kiến nghị id 128/129/131).
    expect(normalizeRecommendationStatus({ status: 'Đã hoàn thành' })).toBe(
      'Completed',
    );
    expect(normalizeRecommendationStatus({ status: 'Chưa khắc phục' })).toBe(
      'NotStarted',
    );
    expect(
      normalizeRecommendationStatus({ status: 'Đã khắc phục một phần' }),
    ).toBe('InProgress');
  });

  it('ánh xạ không phân biệt hoa/thường và khoảng trắng thừa', () => {
    expect(normalizeRecommendationStatus({ status: '  ĐÃ HOÀN THÀNH  ' })).toBe(
      'Completed',
    );
    expect(normalizeRecommendationStatus({ status: 'Quá hạn' })).toBe('Overdue');
    expect(normalizeRecommendationStatus({ status: 'Đã xác nhận' })).toBe(
      'Verified',
    );
  });

  it('suy ra từ closureStatus/progressPercent khi nhãn không nhận dạng được', () => {
    expect(
      normalizeRecommendationStatus({
        status: 'Chuỗi lạ không rõ nghĩa',
        progressPercent: 100,
      }),
    ).toBe('Completed');
    expect(
      normalizeRecommendationStatus({
        status: 'Chuỗi lạ',
        progressPercent: 20,
      }),
    ).toBe('InProgress');
    expect(
      normalizeRecommendationStatus({
        status: 'Chuỗi lạ',
        progressPercent: 0,
      }),
    ).toBe('NotStarted');
  });

  it('nhãn tiếng Việt rõ nghĩa được ưu tiên hơn closureStatus', () => {
    // 'Đã hoàn thành' = ĐVĐKT báo xong → Completed (chờ KTV xác nhận).
    // Nếu ưu tiên closureStatus='Closed' thì thành 'Verified' — SAI, vì
    // 'Verified' chỉ do KTV xác nhận (service close()/verify()).
    expect(
      normalizeRecommendationStatus({
        status: 'Đã hoàn thành',
        closureStatus: 'Closed',
        progressPercent: 100,
      }),
    ).toBe('Completed');
  });

  it('bản ghi đã đóng thật (status Verified) giữ nguyên Verified', () => {
    expect(
      normalizeRecommendationStatus({
        status: 'Verified',
        closureStatus: 'Closed',
      }),
    ).toBe('Verified');
  });

  it('quá hạn khi progressPercent = 0 và dueDate đã qua', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      normalizeRecommendationStatus({ status: null, progressPercent: 0, dueDate: past }),
    ).toBe('Overdue');
  });

  it('không quá hạn khi dueDate ở tương lai', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      normalizeRecommendationStatus({ status: null, progressPercent: 0, dueDate: future }),
    ).toBe('NotStarted');
  });

  it('đầu vào rỗng/không xác định → NotStarted (không ném lỗi)', () => {
    expect(normalizeRecommendationStatus({})).toBe('NotStarted');
    expect(normalizeRecommendationStatus({ status: null })).toBe('NotStarted');
    expect(
      normalizeRecommendationStatus({ status: undefined, progressPercent: null }),
    ).toBe('NotStarted');
  });
});

describe('canReportProgress (TC-AUD-04 — nút "Cập nhật tiến độ")', () => {
  it('bản ghi cũ "Chưa khắc phục" PHẢI cho phép báo cáo tiến độ', () => {
    // Đây là hồi quy trực tiếp: trước khi sửa, nút chỉ hiện khi
    // status === 'NotStarted' nên bản ghi này không bao giờ có nút.
    expect(canReportProgress({ status: 'Chưa khắc phục', progressPercent: 0 })).toBe(
      true,
    );
  });

  it('bản ghi cũ "Đã khắc phục một phần" cho phép báo cáo tiếp', () => {
    expect(
      canReportProgress({ status: 'Đã khắc phục một phần', progressPercent: 40 }),
    ).toBe(true);
  });

  it('không cho báo cáo khi đã 100%', () => {
    expect(
      canReportProgress({ status: 'Đã hoàn thành', progressPercent: 100 }),
    ).toBe(false);
  });

  it('không cho báo cáo khi đã Verified hoặc đã đóng', () => {
    expect(canReportProgress({ status: 'Verified', progressPercent: 50 })).toBe(
      false,
    );
    expect(
      canReportProgress({
        status: 'InProgress',
        closureStatus: 'Closed',
        progressPercent: 50,
      }),
    ).toBe(false);
  });

  it('bản ghi quá hạn vẫn cho báo cáo tiến độ', () => {
    expect(canReportProgress({ status: 'Overdue', progressPercent: 10 })).toBe(
      true,
    );
  });
});

describe('isRecommendationReadOnly', () => {
  it('Verified hoặc Closed → chỉ đọc', () => {
    expect(isRecommendationReadOnly({ status: 'Verified' })).toBe(true);
    expect(
      isRecommendationReadOnly({ status: 'InProgress', closureStatus: 'Closed' }),
    ).toBe(true);
  });

  it('nhãn cũ "Đã xác nhận" cũng phải là chỉ đọc', () => {
    expect(isRecommendationReadOnly({ status: 'Đã xác nhận' })).toBe(true);
  });

  it('đang xử lý → không chỉ đọc', () => {
    expect(isRecommendationReadOnly({ status: 'InProgress' })).toBe(false);
  });
});
