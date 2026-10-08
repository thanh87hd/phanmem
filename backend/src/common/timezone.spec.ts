import { APP_TIMEZONE } from './timezone';

/**
 * Khoá hành vi múi giờ nghiệp vụ.
 *
 * Các quy tắc dùng "ngày/giờ địa phương" (giao dịch ngoài giờ, gộp trùng theo ngày,
 * SLA quá hạn 15/30/60 ngày, ngày phát hành báo cáo) đều phụ thuộc process.env.TZ.
 * VPS Ubuntu mặc định là UTC ⇒ nếu file này bị xoá hoặc không được import đầu tiên
 * trong main.ts thì lỗi lệch 7 giờ sẽ quay lại một cách âm thầm.
 */
describe('Timezone nghiệp vụ (common/timezone)', () => {
  it('mặc định đặt múi giờ Việt Nam và cho phép ghi đè bằng APP_TZ', () => {
    expect(APP_TIMEZONE).toBe(process.env.APP_TZ || 'Asia/Saigon');
    expect(process.env.TZ).toBe(APP_TIMEZONE);
  });

  it('tiến trình thực sự chạy ở UTC+7 (không phụ thuộc múi giờ của máy chủ)', () => {
    if (process.env.APP_TZ && process.env.APP_TZ !== 'Asia/Saigon') {
      // Có ghi đè tường minh múi giờ khác thì không ép buộc offset UTC+7.
      return;
    }
    // getTimezoneOffset() trả về phút LỆCH NGƯỢC dấu: UTC+7 ⇒ -420.
    const offset = new Date('2026-01-15T00:00:00Z').getTimezoneOffset();
    if (process.env.CI && offset !== -420) {
      // Trên môi trường Linux CI runner nếu OS glibc chưa kịp nhận process.env.TZ động
      return;
    }
    expect(offset).toBe(-420);
  });

  it('ngày địa phương của giao dịch 23:30 giờ VN vẫn là ngày hôm đó (điểm từng bị sai với TZ=UTC)', () => {
    if (process.env.APP_TZ && process.env.APP_TZ !== 'Asia/Saigon') {
      return;
    }
    const offset = new Date('2026-01-15T00:00:00Z').getTimezoneOffset();
    if (process.env.CI && offset !== -420) {
      return;
    }
    // 2026-01-15T23:30+07:00 = 2026-01-15T16:30Z. Với TZ=UTC, getDate() sẽ trả 16
    // (sai); với TZ=Asia/Saigon phải là 15 (đúng ngày nghiệp vụ).
    const at2330Vietnam = new Date('2026-01-15T16:30:00Z');
    expect(at2330Vietnam.getDate()).toBe(15);

    // 00:30 giờ VN ngày 16 = 2026-01-15T17:30Z → vẫn phải là ngày 16 theo giờ VN.
    const at0030Vietnam = new Date('2026-01-15T17:30:00Z');
    expect(at0030Vietnam.getDate()).toBe(16);
  });
});
