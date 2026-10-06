import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Mã cơ quan thanh tra/kiểm toán — danh mục ĐÓNG, dùng làm giá trị lưu DB.
 *
 * ⚠️ LỖI ĐÃ SỬA (TC-BKS-02a + sai lệch bộ lọc):
 * Trước đây `POST /regulatory-exams` nhận `@Body() data: any` — KHÔNG có DTO,
 * nên thiếu `authority`/`title` sẽ đâm thẳng vào ràng buộc NOT NULL của DB và
 * trả HTTP 500 thay vì 400 kèm thông báo trường lỗi.
 * Đồng thời form phía frontend lấy `value` từ hàm dịch `t(...)` cho 3/4 lựa
 * chọn → lưu nhãn tiếng Việt vào DB, trong khi bộ lọc so khớp mã
 * `NHNN | KTNN | Thuế | Bộ Công an` → lọc không bao giờ khớp.
 * Nay giá trị lưu là MÃ ỔN ĐỊNH, nhãn hiển thị tách riêng ở frontend.
 */
export const REGULATORY_AUTHORITIES = [
  'NHNN',
  'KTNN',
  'Thue',
  'BoCongAn',
  'Khac',
] as const;

export type RegulatoryAuthority = (typeof REGULATORY_AUTHORITIES)[number];

/** Trạng thái đợt thanh tra — khớp entity (`default: 'Open'`). */
export const REGULATORY_EXAM_STATUSES = ['Open', 'Closed'] as const;

/**
 * `@Transform` trim chuỗi trước khi validate: chuỗi toàn khoảng trắng phải bị
 * coi là RỖNG (nếu không, `"   "` lọt qua `@IsNotEmpty` rồi lưu vào DB).
 */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRegulatoryExamDto {
  @Transform(trim)
  @IsString({ message: 'title phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên đợt thanh tra không được để trống' })
  @MaxLength(500, { message: 'Tên đợt thanh tra tối đa 500 ký tự' })
  title: string;

  @Transform(trim)
  @IsString({ message: 'authority phải là chuỗi' })
  @IsNotEmpty({ message: 'Cơ quan thanh tra không được để trống' })
  @IsIn(REGULATORY_AUTHORITIES as unknown as string[], {
    message: `Cơ quan thanh tra phải thuộc: ${REGULATORY_AUTHORITIES.join(', ')}`,
  })
  authority: RegulatoryAuthority;

  @IsOptional()
  @IsDateString({}, { message: 'startDate phải theo định dạng YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate phải theo định dạng YYYY-MM-DD' })
  endDate?: string;
}

/**
 * DTO cập nhật: mọi trường đều tuỳ chọn (PATCH bán phần).
 * Giữ `whitelist/forbidNonWhitelisted` của global ValidationPipe hoạt động
 * đúng — trường lạ bị từ chối thay vì ghi thẳng xuống DB.
 */
export class UpdateRegulatoryExamDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tên đợt thanh tra không được để trống' })
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Cơ quan thanh tra không được để trống' })
  @IsIn(REGULATORY_AUTHORITIES as unknown as string[])
  authority?: RegulatoryAuthority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsIn(REGULATORY_EXAM_STATUSES as unknown as string[], {
    message: `Trạng thái phải thuộc: ${REGULATORY_EXAM_STATUSES.join(', ')}`,
  })
  status?: string;
}
