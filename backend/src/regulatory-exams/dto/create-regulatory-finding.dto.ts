import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * DTO cho kết luận/kiến nghị của đợt thanh tra (TC-BKS-02a).
 *
 * ⚠️ `examId` KHÔNG khai báo ở đây vì controller lấy từ URL
 * (`POST /regulatory-exams/:id/findings`) rồi tự gộp vào payload — khai báo
 * thừa sẽ khiến client gửi kèm bị `forbidNonWhitelisted` từ chối oan.
 * `status` cũng vậy: mặc định 'Open' do entity quy định.
 */
export class CreateRegulatoryFindingDto {
  @Transform(trim)
  @IsString({ message: 'findingTitle phải là chuỗi' })
  @IsNotEmpty({ message: 'Tiêu đề kết luận/kiến nghị không được để trống' })
  @MaxLength(1000, { message: 'Tiêu đề tối đa 1000 ký tự' })
  findingTitle: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  requirement?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsDateString({}, { message: 'deadline phải theo định dạng YYYY-MM-DD' })
  deadline?: string;

  @IsOptional()
  @IsInt()
  linkedInternalFindingId?: number;
}

/** PATCH bán phần — mọi trường tuỳ chọn. */
export class UpdateRegulatoryFindingDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề kết luận/kiến nghị không được để trống' })
  @MaxLength(1000)
  findingTitle?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  requirement?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
