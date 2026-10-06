import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO báo cáo tiến độ khắc phục từ cổng Đơn vị được kiểm toán.
 *
 * ⚠️ LỖI ĐÃ SỬA (TC-AUD-04 — "Cập nhật tiến độ không ra thông tin"):
 *
 * 1) DTO cũ CHỈ khai báo 3 trường (`progressPercent`, `response`, `notes`) trong
 *    khi `AuditeePortal.handleSubmitProgress` gửi **11 trường**. Global
 *    ValidationPipe trong `main.ts` bật `whitelist: true` +
 *    `forbidNonWhitelisted: true`, nên 7 trường dư bị từ chối thẳng:
 *        HTTP 400 "property remediationFeasibility should not exist"
 *    ⇒ MỌI lần bấm "Cập nhật tiến độ" trên cổng ĐVĐKT đều thất bại.
 *
 * 2) `RecommendationsService.updateProgress` đã có sẵn tham số `extra` để ghi
 *    các trường kế hoạch khắc phục, nhưng controller gọi hàm với đúng 4 tham số
 *    ⇒ `extra` LUÔN `undefined` ⇒ kế hoạch khắc phục không bao giờ được lưu.
 *
 * 3) Lệch tên trường: frontend gửi `auditeeUnitHead` / `auditeePoc` còn service
 *    đọc `legacyAuditeeUnitHead` / `legacyAuditeePoc`. DTO dưới đây khai báo
 *    theo TÊN FRONTEND GỬI (hợp đồng API thực tế) và service được cập nhật để
 *    ánh xạ đúng sang cột entity.
 *
 * Giữ `forbidNonWhitelisted` là chủ ý: nó bảo vệ trước việc ghi trường tuỳ ý
 * xuống DB. Cách sửa đúng là khai báo ĐỦ trường hợp lệ, không phải tắt bảo vệ.
 */
export class UpdateProgressDto {
  @IsNumber({}, { message: 'progressPercent phải là số' })
  @Min(0, { message: 'Tiến độ không được nhỏ hơn 0%' })
  @Max(100, { message: 'Tiến độ không được lớn hơn 100%' })
  progressPercent: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  response?: string;

  /** Ghi chú của đơn vị — lưu vào cột `auditeeNotes`. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsBoolean({ message: 'remediationFeasibility phải là true/false' })
  remediationFeasibility?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remediationUnfeasibleReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  auditeeProposal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  monitoringCycle?: string;

  /** Trưởng đơn vị được kiểm toán (frontend gửi tên này). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  auditeeUnitHead?: string;

  /** Nhân sự đầu mối của đơn vị (frontend gửi tên này). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  auditeePoc?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(2000)
  evidenceLink?: string;
}
