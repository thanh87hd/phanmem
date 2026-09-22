import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateRiskCriterionDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên tiêu chí không được để trống' })
  name: string;

  @IsNumber()
  @Min(1, { message: 'Trọng số phải từ 1 đến 100' })
  @Max(100, { message: 'Trọng số phải từ 1 đến 100' })
  weight: number;

  @IsString()
  @IsNotEmpty({ message: 'Nhóm rủi ro không được để trống' })
  category: string;

  @IsString()
  @IsNotEmpty({ message: 'Nhóm kiểm toán không được để trống' })
  auditCategory: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
