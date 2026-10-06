/**
 * Múi giờ nghiệp vụ của hệ thống.
 *
 * ⚠️ VÌ SAO CẦN FILE NÀY:
 * Nhiều quy tắc nghiệp vụ dùng "ngày/giờ ĐỊA PHƯƠNG" của tiến trình Node:
 *  - ContinuousMonitoringService.detectOffHoursTransactions() (giao dịch ngoài giờ 06:00–20:00)
 *  - ContinuousMonitoringService.detectDuplicatePayments() (gộp trùng theo NGÀY địa phương)
 *  - RecommendationsService.checkAndMarkOverdue() (tính số ngày quá hạn, mốc 15/30/60)
 *  - AuditReportsService (ngày phát hành báo cáo)
 *
 * VPS/CI mặc định thường chạy UTC, khi đó "ngày địa phương" = ngày UTC và các quy
 * tắc trên bị lệch 7 giờ: giao dịch 23:30 giờ VN bị coi là hôm trước, giao dịch
 * 00:30 và 23:30 cùng ngày VN bị coi là khác ngày. Đặt TZ ở đây để hành vi KHÔNG
 * phụ thuộc cấu hình pm2/docker/OS (Node ≥16 áp dụng ngay khi đổi process.env.TZ).
 *
 * Có thể ghi đè bằng biến môi trường APP_TZ nếu triển khai ở múi giờ khác.
 */
process.env.TZ = process.env.APP_TZ || 'Asia/Saigon';

export const APP_TIMEZONE = process.env.TZ;
